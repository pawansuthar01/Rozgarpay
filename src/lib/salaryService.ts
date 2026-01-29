// Production-Grade Salary Calculation Service
// Handles all salary types, attendance mapping, calculations, and audit trails

import { prisma } from "@/lib/prisma";
import { SalaryType, AttendanceStatus, AuditAction } from "@prisma/client";
import { generateSalaryPDFBuffer } from "@/lib/pdfGenerator";
import { uploadPDF, deletePDF } from "@/lib/cloudinary";

export interface SalaryCalculationInput {
  userId: string;
  companyId: string;
  month: number;
  year: number;
}

export interface SalaryCalculationResult {
  success: boolean;
  salary?: any;
  breakdowns?: any[];
  error?: string;
}

export interface AttendanceSummary {
  approvedDays: number;
  workingHours: number;
  overtimeHours: number;
  leavesDays: number;
  lateMinutes: number;
  halfDays: number;
  absentDays: number;
  rejectedDays: number;
}

export class SalaryService {
  /**
   * Calculate balance for a salary including ledger adjustments
   * Positive balance = Company owes employee
   * Negative balance = Employee owes company
   */
  calculateSalaryBalance(salary: any, ledger: any[]) {
    const paid = ledger
      .filter((l) => l.type === "PAYMENT")
      .reduce((s, l) => s + l.amount, 0);

    const recovered = ledger
      .filter((l) => l.type === "RECOVERY")
      .reduce((s, l) => s + Math.abs(l.amount), 0);

    const deductions = ledger
      .filter((l) => l.type === "DEDUCTION")
      .reduce((s, l) => s + Math.abs(l.amount), 0);

    return salary.netAmount - paid + recovered - deductions;
  }

  /**
   * Generate salary for a user for a specific month
   * Idempotent operation - can be called multiple times safely
   */
  async generateSalary(
    input: SalaryCalculationInput,
  ): Promise<SalaryCalculationResult> {
    const { userId, companyId, month, year } = input;

    try {
      // Check if salary already exists and is locked
      const existingSalary = await prisma.salary.findUnique({
        where: { userId_month_year: { userId, month, year } },
        include: { breakdowns: true },
      });

      if (existingSalary && existingSalary.lockedAt) {
        return {
          success: false,
          error: "Salary is locked and cannot be regenerated",
        };
      }
      if (existingSalary?.status === "PAID") {
        return {
          success: false,
          error: "Paid salary cannot be regenerated",
        };
      }

      // Get user and company settings
      const [user, company] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            baseSalary: true,
            hourlyRate: true,
            dailyRate: true,
            salaryType: true,
            workingDays: true,
            overtimeRate: true,
            pfEsiApplicable: true,
            joiningDate: true,
          },
        }),
        prisma.company.findUnique({
          where: { id: companyId },
          select: {
            id: true,
            name: true,
            defaultSalaryType: true,
            overtimeMultiplier: true,
            enableLatePenalty: true,
            latePenaltyPerMinute: true,
            enableAbsentPenalty: true,
            halfDayThresholdHours: true,
            absentPenaltyPerDay: true,
            pfPercentage: true,
            esiPercentage: true,
            minWorkingHours: true,
            maxDailyHours: true,
            overtimeThresholdHours: true,
          },
        }),
      ]);

      if (!user || !company) {
        return { success: false, error: "User or company not found" };
      }

      // Determine salary type
      const salaryType =
        user.salaryType || company.defaultSalaryType || SalaryType.MONTHLY;

      // Get attendance summary for the month
      const attendanceSummary = await this.getAttendanceSummary(
        userId,
        user,
        companyId,
        month,
        year,
      );

      // Calculate salary components
      const calculation = await this.calculateSalaryComponents(
        user,
        company,
        salaryType,
        attendanceSummary,
      );
      const shouldIncrementVersion =
        !existingSalary ||
        calculation.baseAmount !== existingSalary.baseAmount ||
        calculation.overtimeAmount !== existingSalary.overtimeAmount ||
        calculation.penaltyAmount !== existingSalary.penaltyAmount ||
        calculation.grossAmount !== existingSalary.grossAmount;
      const payableDays =
        attendanceSummary.approvedDays -
        attendanceSummary.halfDays +
        attendanceSummary.halfDays * 0.5;

      // Create or update salary record
      const salaryData = {
        userId,
        companyId,
        month,
        year,
        totalWorkingDays: payableDays,

        totalWorkingHours: attendanceSummary.workingHours,
        overtimeHours: attendanceSummary.overtimeHours,
        lateMinutes: attendanceSummary.lateMinutes,
        halfDays: attendanceSummary.halfDays,
        absentDays: attendanceSummary.absentDays,
        baseAmount: calculation.baseAmount,
        overtimeAmount: calculation.overtimeAmount,
        penaltyAmount: calculation.penaltyAmount,
        deductions: calculation.deductions,
        grossAmount: calculation.grossAmount,
        netAmount: calculation.netAmount,
        type: salaryType,
        status: "PENDING",
        version: shouldIncrementVersion
          ? (existingSalary?.version || 0) + 1
          : (existingSalary.version ?? 1),
      };
      let salary: any;

      await prisma.$transaction(async (tx) => {
        salary = await tx.salary.upsert({
          where: { userId_month_year: { userId, month, year } },
          update: salaryData,
          create: salaryData,
        });

        await tx.salaryBreakdown.deleteMany({
          where: { salaryId: salary.id },
        });

        await tx.salaryBreakdown.createMany({
          data: calculation.breakdowns.map((b) => ({
            salaryId: salary.id,
            type: b.type,
            description: b.description,
            amount: b.amount,
            hours: b.hours,
            quantity: b.quantity,
          })),
        });

        await tx.auditLog.create({
          data: {
            userId: salary.userId,
            action: existingSalary ? AuditAction.UPDATED : AuditAction.CREATED,

            entity: "Salary",
            entityId: salary.id,
            salaryId: salary.id,
            meta: {
              action: existingSalary ? "REGENERATED" : "CREATED",
              version: salaryData.version,
            },
          },
        });
      });

      // Generate and upload PDF after salary creation
      try {
        const pdfData = await this.generateSalaryPDFData(salary.id);
        const pdfBuffer = generateSalaryPDFBuffer({
          data: pdfData,
          companyName: company.name,
        });

        // Validate PDF buffer
        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new Error("Generated PDF buffer is empty or invalid");
        }

        console.log(`Generated PDF buffer size: ${pdfBuffer.length} bytes`);

        const filename = `${user.firstName}_${user.lastName}_salary_${month}_${year}`;
        const pdfUrl = await uploadPDF(pdfBuffer, "salary-pdfs", filename);

        // Update salary with PDF URL
        await prisma.salary.update({
          where: { id: salary.id },
          data: { pdfUrl },
        });

        salary.pdfUrl = pdfUrl;
      } catch (pdfError) {
        console.error("Failed to generate/upload PDF:", pdfError);
        // Don't fail the salary generation if PDF fails
      }

      return {
        success: true,
        salary,
        breakdowns: calculation.breakdowns,
      };
    } catch (error) {
      console.error("Error generating salary:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get attendance summary for salary calculation
   */
  private async getAttendanceSummary(
    userId: string,
    user: any,
    companyId: string,
    month: number,
    year: number,
  ): Promise<AttendanceSummary> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month
    if (user?.joiningDate) {
      const joinDate = new Date(user.joiningDate);
      if (joinDate > startDate) {
        startDate.setDate(joinDate.getDate());
      }
    }
    // Get company settings for shift times
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        shiftStartTime: true,
        gracePeriodMinutes: true,
        halfDayThresholdHours: true,
      },
    });

    if (!company) {
      throw new Error("Company not found");
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        userId,
        companyId,
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        attendanceDate: true,
        punchIn: true,
        punchOut: true,
        workingHours: true,
        LateMinute: true,
        overtimeHours: true,
        shiftDurationHours: true,
        status: true,
        rejectionReason: true,
        autoPunchOut: true,
      },
    });

    let approvedDays = 0;
    let workingHours = 0;
    let overtimeHours = 0;
    let lateMinutes = 0;
    let halfDays = 0;
    let absentDays = 0;
    let leavesDays = 0;
    let rejectedDays = 0;

    for (const attendance of attendances) {
      if (attendance.status === AttendanceStatus.APPROVED) {
        approvedDays++;
        let isHalfDayOnly = false;
        if (attendance.workingHours) {
          workingHours += attendance.workingHours;
          isHalfDayOnly =
            (company.halfDayThresholdHours &&
              attendance.workingHours < company.halfDayThresholdHours) ||
            false;
          // Check for half day

          if (isHalfDayOnly) {
            halfDays++;
          }
        }

        if (attendance.overtimeHours && !isHalfDayOnly) {
          overtimeHours += attendance.overtimeHours;
        }

        if (attendance.punchIn && (attendance.LateMinute ?? 0) > 0) {
          lateMinutes += attendance.LateMinute!;
        }
      } else if (attendance.status === AttendanceStatus.LEAVE) {
        // LEAVE counts as present day but no working hours, overtime, or penalties
        leavesDays++;
      } else if (attendance.status === AttendanceStatus.REJECTED) {
        rejectedDays++;
      } else if (attendance.status === AttendanceStatus.ABSENT) {
        // ABSENT day
        absentDays++;
      }
    }

    return {
      approvedDays,
      workingHours,
      overtimeHours,
      lateMinutes,
      halfDays,
      absentDays,
      leavesDays,
      rejectedDays,
    };
  }

  /**
   * Calculate salary components based on type and attendance
   */
  private async calculateSalaryComponents(
    user: any,
    company: any,
    salaryType: SalaryType,
    attendance: AttendanceSummary,
  ): Promise<{
    baseAmount: number;
    overtimeAmount: number;
    penaltyAmount: number;
    deductions: number;
    grossAmount: number;
    netAmount: number;
    breakdowns: any[];
  }> {
    const breakdowns: any[] = [];
    let baseAmount = 0;
    let overtimeAmount = 0;
    let penaltyAmount = 0;
    let deductions = 0;

    // Base salary calculation
    switch (salaryType) {
      case SalaryType.MONTHLY:
        if (user.baseSalary && user.workingDays) {
          const perDaySalary = user.baseSalary / user.workingDays;
          const payableDays =
            attendance.approvedDays -
            attendance.halfDays +
            attendance.halfDays * 0.5;
          baseAmount = perDaySalary * payableDays;
          breakdowns.push({
            type: "BASE_SALARY",
            description: "Monthly Salary (Prorated)",

            amount: baseAmount,
            quantity: payableDays,
          });
        }
        break;

      case SalaryType.HOURLY:
        if (user.hourlyRate) {
          baseAmount = user.hourlyRate * attendance.workingHours;
          breakdowns.push({
            type: "BASE_SALARY",
            description: `Hourly Rate (${user.hourlyRate}/hr)`,
            amount: baseAmount,
            hours: attendance.workingHours,
            quantity: attendance.workingHours,
          });
        }
        break;

      case SalaryType.DAILY:
        if (user.dailyRate) {
          const fullDays = attendance.approvedDays - attendance.halfDays;
          const halfDayPay = (user.dailyRate / 2) * attendance.halfDays;
          baseAmount = fullDays * user.dailyRate + halfDayPay;
          breakdowns.push({
            type: "BASE_SALARY",
            description: `Daily Rate (${user.dailyRate}/day)`,
            amount: baseAmount,
            quantity: attendance.approvedDays,
          });
        }
        break;
    }

    if (attendance.overtimeHours > 0) {
      let baseHourlyRate = 0;

      // 1️⃣ Hourly salary
      if (salaryType === SalaryType.HOURLY && user.hourlyRate) {
        baseHourlyRate = user.hourlyRate;
      }

      // 2️⃣ Daily salary
      else if (
        salaryType === SalaryType.DAILY &&
        user.dailyRate &&
        company.minWorkingHours
      ) {
        baseHourlyRate = user.dailyRate / company.minWorkingHours;
      }

      // 3️⃣ Monthly salary
      else if (
        salaryType === SalaryType.MONTHLY &&
        user.baseSalary &&
        user.workingDays &&
        company.minWorkingHours
      ) {
        baseHourlyRate =
          user.baseSalary / (user.workingDays * company.minWorkingHours);
      }

      if (baseHourlyRate > 0 && attendance.overtimeHours > 0) {
        const overtimeRate =
          user.overtimeRate ??
          baseHourlyRate * (company.overtimeMultiplier ?? 1);

        overtimeAmount = overtimeRate * attendance.overtimeHours;
        breakdowns.push({
          type: "OVERTIME",
          description: "Overtime Pay",
          amount: overtimeAmount,
          hours: attendance.overtimeHours,
          quantity: attendance.overtimeHours,
          rate: overtimeRate,
        });
      }
    }

    // Penalties
    if (
      attendance.lateMinutes > 0 &&
      company.enableLatePenalty &&
      company.latePenaltyPerMinute
    ) {
      const latePenalty = attendance.lateMinutes * company.latePenaltyPerMinute;

      penaltyAmount += latePenalty;
      breakdowns.push({
        type: "LATE_PENALTY",
        description: "Late Arrival Penalty",
        amount: latePenalty,

        quantity: attendance.lateMinutes,
      });
    }

    if (
      attendance.absentDays > 0 &&
      company.enableAbsentPenalty &&
      company.absentPenaltyPerDay
    ) {
      const absentPenalty = attendance.absentDays * company.absentPenaltyPerDay;

      penaltyAmount += absentPenalty;

      breakdowns.push({
        type: "ABSENT_PENALTY",
        description: "Absent Days Penalty",
        amount: absentPenalty,
        quantity: attendance.absentDays,
      });
    }

    // Deductions
    const grossAmount = baseAmount + overtimeAmount - penaltyAmount;
    const statutoryBase = baseAmount;
    if (user.pfEsiApplicable && grossAmount > 0) {
      if (company.pfPercentage) {
        const pfDeduction = statutoryBase * (company.pfPercentage / 100);
        deductions += pfDeduction;
        breakdowns.push({
          type: "PF_DEDUCTION",
          description: "Provident Fund",
          amount: pfDeduction,
        });
      }

      if (company.esiPercentage) {
        const esiDeduction = statutoryBase * (company.esiPercentage / 100);
        deductions += esiDeduction;
        breakdowns.push({
          type: "ESI_DEDUCTION",
          description: "Employee State Insurance",
          amount: esiDeduction,
        });
      }
    }
    const netAmount = Math.max(0, grossAmount - deductions);

    return {
      baseAmount,
      overtimeAmount,
      penaltyAmount,
      deductions,
      grossAmount,
      netAmount,
      breakdowns,
    };
  }

  /**
   * Create salary breakdown records
   */
  private async createSalaryBreakdowns(
    salaryId: string,
    breakdowns: any[],
  ): Promise<void> {
    // Delete existing breakdowns
    await prisma.salaryBreakdown.deleteMany({
      where: { salaryId },
    });

    // Create new breakdowns

    await prisma.salaryBreakdown.createMany({
      data: breakdowns.map((breakdown) => ({
        salaryId,
        type: breakdown.type,
        description: breakdown.description,
        amount: breakdown.amount,
        hours: breakdown.hours,
        quantity: breakdown.quantity,
      })),
    });
  }

  /**
   * Approve salary
   */
  async approveSalary(
    salaryId: string,
    approvedBy: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const salary = await prisma.salary.findUnique({
        where: { id: salaryId },
        select: { id: true, status: true, lockedAt: true, userId: true },
      });

      if (!salary) {
        return { success: false, error: "Salary not found" };
      }

      if (salary.status !== "PENDING") {
        return { success: false, error: "Salary is not in pending status" };
      }

      if (salary.lockedAt) {
        return { success: false, error: "Salary is locked" };
      }

      await prisma.salary.update({
        where: { id: salaryId },
        data: {
          status: "APPROVED",
          approvedBy,
          approvedAt: new Date(),
        },
      });

      await this.logSalaryAudit(salaryId, salary.userId, AuditAction.APPROVED, {
        approvedBy,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Mark salary as paid
   */
  async markAsPaid(
    salaryId: string,
    paidAt?: Date,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const salary = await prisma.salary.findFirst({
        where: {
          id: salaryId,

          status: "APPROVED",
        },
        include: {
          ledger: true, // 👈 IMPORTANT
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!salary) {
        return { success: false, error: "Salary not found" };
      }

      if (salary.status !== "APPROVED") {
        return {
          success: false,
          error: "Salary must be approved before marking as paid",
        };
      }

      if (salary.lockedAt) {
        return { success: false, error: "Salary is locked" };
      }
      const remainingBalance = salaryService.calculateSalaryBalance(
        salary,
        salary.ledger,
      );

      if (remainingBalance <= 0) {
        return { success: false, error: "Salary already settled or overpaid" };
      }
      if (salary.netAmount > remainingBalance) {
        return {
          success: false,
          error: "Payment exceeds remaining salary balance",
        };
      }

      await prisma.salary.update({
        where: { id: salaryId },
        data: {
          status: "PAID",
          paidAt: paidAt || new Date(),
          lockedAt: new Date(), // Lock after payment
        },
      });

      await this.logSalaryAudit(salaryId, salary.userId, AuditAction.UPDATED, {
        action: "MARKED_AS_PAID",
        paidAt: paidAt || new Date(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Recalculate salary on attendance correction
   */
  async recalculateSalary(salaryId: string): Promise<SalaryCalculationResult> {
    const salary = await prisma.salary.findUnique({
      where: { id: salaryId },
      select: {
        id: true,
        userId: true,
        companyId: true,
        month: true,
        year: true,
        lockedAt: true,
        paidAt: true,
        status: true,
      },
    });

    if (!salary) {
      return { success: false, error: "Salary not found" };
    }
    if (salary.status == "PAID") {
      return {
        success: false,
        error: "paid salary cannot be recalculated",
      };
    }

    if (salary.lockedAt) {
      return {
        success: false,
        error: "Salary is locked and cannot be recalculated",
      };
    }

    // Allow recalculation even after payment for corrections, but log it
    const input: SalaryCalculationInput = {
      userId: salary.userId,
      companyId: salary.companyId,
      month: salary.month,
      year: salary.year,
    };

    const result = await this.generateSalary(input);

    if (result.success && salary.paidAt) {
      // Log that this was a recalculation after payment
      await this.logSalaryAudit(salaryId, salary.userId, AuditAction.UPDATED, {
        action: "RECALCULATED_AFTER_PAYMENT",
        reason: "Attendance correction",
      });
    }

    // Generate new PDF for recalculated salary
    if (result.success && result.salary) {
      try {
        const pdfData = await this.generateSalaryPDFData(salaryId);
        const company = await prisma.company.findUnique({
          where: { id: salary.companyId },
          select: { name: true },
        });
        const user = await prisma.user.findUnique({
          where: { id: salary.userId },
          select: { firstName: true, lastName: true },
        });

        const pdfBuffer = generateSalaryPDFBuffer({
          data: pdfData,
          companyName: company?.name || "Company",
        });

        // Validate PDF buffer
        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new Error("Generated PDF buffer is empty or invalid");
        }

        console.log(
          `Generated PDF buffer size for recalculation: ${pdfBuffer.length} bytes`,
        );

        // Delete old PDF if it exists
        if (result.salary.pdfUrl) {
          try {
            // Extract public ID from Cloudinary URL
            const urlParts = result.salary.pdfUrl.split("/");
            const filenameWithExtension = urlParts[urlParts.length - 1];
            const publicId = `salary-pdfs/${filenameWithExtension.replace(".pdf", "")}`;
            await deletePDF(publicId);
          } catch (deleteError) {
            console.error("Failed to delete old PDF:", deleteError);
            // Continue with upload even if delete fails
          }
        }

        // Upload new PDF with consistent filename (no version suffix)
        const filename = `${user?.firstName}_${user?.lastName}_salary_${salary.month}_${salary.year}`;
        const pdfUrl = await uploadPDF(pdfBuffer, "salary-pdfs", filename);

        // Update salary with new PDF URL
        await prisma.salary.update({
          where: { id: salaryId },
          data: { pdfUrl },
        });

        result.salary.pdfUrl = pdfUrl;
      } catch (pdfError) {
        console.error(
          "Failed to generate/upload PDF for recalculation:",
          pdfError,
        );
        // Don't fail the recalculation if PDF fails
      }
    }

    return result;
  }

  /**
   * Generate PDF data for salary
   */
  private async generateSalaryPDFData(salaryId: string) {
    const salary = await prisma.salary.findUnique({
      where: { id: salaryId },
      include: {
        user: true,
        company: true,
        ledger: {
          orderBy: { createdAt: "desc" },
        },
        breakdowns: true,
      },
    });

    if (!salary) throw new Error("Salary not found");

    // Validate required salary data
    if (salary.grossAmount === null || salary.netAmount === null) {
      throw new Error("Salary amounts are not calculated yet");
    }

    // Get deductions and recoveries from ledger
    const deductions = salary.ledger.filter(
      (item) => item.type === "DEDUCTION",
    );
    const recoveries = salary.ledger.filter((item) => item.type === "RECOVERY");
    const payments = salary.ledger.filter(
      (item) => item.type === "PAYMENT" || item.type === "EARNING",
    );
    // Calculate balance using the same logic as calculateSalaryBalance
    let balanceAmount = salary.netAmount;
    salary.ledger.forEach((ledger) => {
      if (ledger.type === "PAYMENT") {
        balanceAmount -= ledger.amount;
      } else if (ledger.type === "EARNING") {
        balanceAmount += ledger.amount;
      } else if (ledger.type === "DEDUCTION" || ledger.type === "RECOVERY") {
        balanceAmount -= Math.abs(ledger.amount);
      }
    });
    return {
      user: {
        id: salary.user.id,
        firstName: salary.user.firstName || "",
        lastName: salary.user.lastName || "",
        email: salary.user.email,
        phone: salary.user.phone,
      },
      month: salary.month,
      year: salary.year,
      grossAmount: salary.grossAmount || 0,
      netAmount: salary.netAmount || 0,
      totalPaid: salary.ledger
        .filter((item) => item.type === "PAYMENT" || item.type === "EARNING")
        .reduce((sum, item) => sum + (item.amount || 0), 0),
      totalRecovered: salary.ledger
        .filter((item) => item.type === "DEDUCTION" || item.type === "RECOVERY")
        .reduce((sum, item) => sum + (item.amount || 0), 0),
      balanceAmount: balanceAmount || 0,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount || 0,
        type: p.reason || "",
        description: p.reason || "",
        date: p.createdAt.toISOString(),
      })),
      deductions: deductions.map((d) => ({
        id: d.id,
        amount: d.amount || 0,
        type: d.reason || "",
        description: d.reason || "",
        date: d.createdAt.toISOString(),
      })),
      recoveries: recoveries.map((r) => ({
        id: r.id,
        amount: Math.abs(r.amount || 0),
        type: r.type,
        description: r.reason || "",
        date: r.createdAt.toISOString(),
      })),
      recentTransactions: salary.ledger
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 10)
        .map((entry) => ({
          id: entry.id,
          amount: entry.amount,
          type: entry.type,
          description: entry.reason,
          date: entry.createdAt.toISOString(),
        })),
    };
  }

  /**
   * Log salary audit trail
   */
  private async logSalaryAudit(
    salaryId: string,
    userId: string,
    action: AuditAction,
    meta?: any,
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: "Salary",
        entityId: salaryId,
        salaryId,
        meta,
      },
    });
  }

  /**
   * Auto-generate salaries for all users in a company for a month
   */
  async autoGenerateSalaries(
    companyId: string,
    month: number,
    year: number,
  ): Promise<{
    success: boolean;
    processed: number;
    errors: string[];
  }> {
    const users = await prisma.user.findMany({
      where: {
        companyId,
        status: "ACTIVE",
        role: { in: ["STAFF", "MANAGER"] },
      },
      select: { id: true },
    });

    let processed = 0;
    const errors: string[] = [];

    // Process users in batches of 10 for better performance
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchPromises = batch.map(async (user) => {
        try {
          const result = await this.generateSalary({
            userId: user.id,
            companyId,
            month,
            year,
          });

          if (result.success) {
            return { success: true, error: null };
          } else {
            return {
              success: false,
              error: `User ${user.id}: ${result.error}`,
            };
          }
        } catch (error) {
          return {
            success: false,
            error: `User ${user.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result) => {
        if (result.success) {
          processed++;
        } else if (result.error) {
          errors.push(result.error);
        }
      });
    }

    return {
      success: errors.length === 0,
      processed,
      errors,
    };
  }
}

// Export singleton instance
export const salaryService = new SalaryService();

// Production-Grade Salary Calculation Service
// Handles all salary types, attendance mapping, calculations, and audit trails

import { prisma } from "@/lib/prisma";
import { SalaryType, AttendanceStatus, AuditAction } from "@prisma/client";

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
  totalDays: number;
  approvedDays: number;
  workingHours: number;
  overtimeHours: number;
  lateMinutes: number;
  halfDays: number;
  absentDays: number;
  rejectedDays: number;
}

export class SalaryService {
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

      // Create or update salary record
      const salaryData = {
        userId,
        companyId,
        month,
        year,
        totalWorkingDays: attendanceSummary.totalDays,
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
        version: (existingSalary?.version || 0) + 1,
      };

      const salary = await prisma.salary.upsert({
        where: { userId_month_year: { userId, month, year } },
        update: salaryData,
        create: salaryData,
        include: { breakdowns: true },
      });

      // Create/update breakdowns
      await this.createSalaryBreakdowns(salary.id, calculation.breakdowns);

      // Log audit
      await this.logSalaryAudit(salary.id, AuditAction.CREATED, {
        action: existingSalary ? "REGENERATED" : "CREATED",
        previousVersion: existingSalary?.version,
      });

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
    companyId: string,
    month: number,
    year: number,
  ): Promise<AttendanceSummary> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    // Get company settings for shift times
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        shiftStartTime: true,
        gracePeriodMinutes: true,
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
        overtimeHours: true,
        isLate: true,
        status: true,
        autoPunchOut: true,
      },
    });

    let totalDays = 0;
    let approvedDays = 0;
    let workingHours = 0;
    let overtimeHours = 0;
    let lateMinutes = 0;
    let halfDays = 0;
    let absentDays = 0;
    let rejectedDays = 0;

    for (const attendance of attendances) {
      totalDays++;

      if (attendance.status === AttendanceStatus.APPROVED) {
        approvedDays++;

        if (attendance.workingHours) {
          workingHours += attendance.workingHours;

          // Check for half day
          if (attendance.workingHours < 4) {
            // Company setting
            halfDays++;
          }
        }

        if (attendance.overtimeHours) {
          overtimeHours += attendance.overtimeHours;
        }

        if (attendance.isLate && attendance.punchIn) {
          // Calculate actual late minutes
          const shiftStart = new Date(attendance.attendanceDate);
          const [h, m] = company.shiftStartTime?.split(":").map(Number) || [
            0, 0,
          ];
          shiftStart.setHours(h, m, 0, 0);

          // Add grace period
          shiftStart.setMinutes(
            shiftStart.getMinutes() + (company.gracePeriodMinutes || 30),
          );

          const lateMs = attendance.punchIn.getTime() - shiftStart.getTime();
          const lateMins = Math.max(0, Math.floor(lateMs / (1000 * 60)));
          lateMinutes += lateMins;
        }
      } else if ((attendance.status as any) === "LEAVE") {
        // LEAVE counts as present day but no working hours, overtime, or penalties
        approvedDays++;
      } else if (attendance.status === AttendanceStatus.REJECTED) {
        rejectedDays++;
      }
    }

    // Calculate absent days (total days in month minus present days)
    const daysInMonth = endDate.getDate();
    absentDays = daysInMonth - totalDays;

    return {
      totalDays,
      approvedDays,
      workingHours,
      overtimeHours,
      lateMinutes,
      halfDays,
      absentDays,
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
        if (user.baseSalary) {
          baseAmount = user.baseSalary;
          breakdowns.push({
            type: "BASE_SALARY",
            description: "Monthly Base Salary",
            amount: baseAmount,
            quantity: 1,
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
          baseAmount = user.dailyRate * attendance.approvedDays;
          breakdowns.push({
            type: "BASE_SALARY",
            description: `Daily Rate (${user.dailyRate}/day)`,
            amount: baseAmount,
            quantity: attendance.approvedDays,
          });
        }
        break;
    }

    // Overtime calculation
    if (attendance.overtimeHours > 0) {
      const overtimeRate =
        user.overtimeRate ||
        (user.hourlyRate || user.baseSalary / 160) *
          (company.overtimeMultiplier || 1.5);
      overtimeAmount = overtimeRate * attendance.overtimeHours;
      breakdowns.push({
        type: "OVERTIME",
        description: "Overtime Pay",
        amount: overtimeAmount,
        hours: attendance.overtimeHours,
        quantity: attendance.overtimeHours,
      });
    }

    // Penalties
    if (
      attendance.lateMinutes > 0 &&
      company.enableLatePenalty &&
      company.latePenaltyPerMinute
    ) {
      penaltyAmount += attendance.lateMinutes * company.latePenaltyPerMinute;
      breakdowns.push({
        type: "LATE_PENALTY",
        description: "Late Arrival Penalty",
        amount: penaltyAmount,
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

    if (user.pfEsiApplicable && grossAmount > 0) {
      if (company.pfPercentage) {
        const pfDeduction = grossAmount * (company.pfPercentage / 100);
        deductions += pfDeduction;
        breakdowns.push({
          type: "PF_DEDUCTION",
          description: "Provident Fund",
          amount: pfDeduction,
        });
      }

      if (company.esiPercentage) {
        const esiDeduction = grossAmount * (company.esiPercentage / 100);
        deductions += esiDeduction;
        breakdowns.push({
          type: "ESI_DEDUCTION",
          description: "Employee State Insurance",
          amount: esiDeduction,
        });
      }
    }

    const netAmount = grossAmount - deductions;

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
    for (const breakdown of breakdowns) {
      await prisma.salaryBreakdown.create({
        data: {
          salaryId,
          type: breakdown.type,
          description: breakdown.description,
          amount: breakdown.amount,
          hours: breakdown.hours,
          quantity: breakdown.quantity,
        },
      });
    }
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
        select: { id: true, status: true, lockedAt: true },
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

      await this.logSalaryAudit(salaryId, AuditAction.APPROVED, { approvedBy });

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
      const salary = await prisma.salary.findUnique({
        where: { id: salaryId },
        select: { id: true, status: true, lockedAt: true },
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

      await prisma.salary.update({
        where: { id: salaryId },
        data: {
          status: "PAID",
          paidAt: paidAt || new Date(),
          lockedAt: new Date(), // Lock after payment
        },
      });

      await this.logSalaryAudit(salaryId, AuditAction.UPDATED, {
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
      },
    });

    if (!salary) {
      return { success: false, error: "Salary not found" };
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
      await this.logSalaryAudit(salaryId, AuditAction.UPDATED, {
        action: "RECALCULATED_AFTER_PAYMENT",
        reason: "Attendance correction",
      });
    }

    return result;
  }

  /**
   * Log salary audit trail
   */
  private async logSalaryAudit(
    salaryId: string,
    action: AuditAction,
    meta?: any,
  ): Promise<void> {
    // Get current user from context (would be passed in real implementation)
    const userId = "system"; // Placeholder

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
        role: { in: ["STAFF", "MANAGER", "ACCOUNTANT"] },
      },
      select: { id: true },
    });

    let processed = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        const result = await this.generateSalary({
          userId: user.id,
          companyId,
          month,
          year,
        });

        if (result.success) {
          processed++;
        } else {
          errors.push(`User ${user.id}: ${result.error}`);
        }
      } catch (error) {
        errors.push(
          `User ${user.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
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

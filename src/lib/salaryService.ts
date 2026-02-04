// Production-Grade Salary Calculation Service
// Handles all salary types, attendance mapping, calculations, and audit trails

import { prisma } from "@/lib/prisma";
import { SalaryType, AttendanceStatus, AuditAction } from "@prisma/client";
import { getDate } from "./attendanceUtils";
import { getCurrentTime } from "./utils";

// ============================================================================
// Types and Interfaces
// ============================================================================

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

export interface SalaryBreakdown {
  type: string;
  description: string;
  amount: number;
  hours?: number;
  quantity?: number;
  rate?: number;
}

export interface SalaryComponents {
  baseAmount: number;
  overtimeAmount: number;
  penaltyAmount: number;
  deductions: number;
  grossAmount: number;
  netAmount: number;
  breakdowns: SalaryBreakdown[];
}

export interface UserSalaryConfig {
  id: string;
  firstName: string;
  lastName: string;
  baseSalary: number | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  salaryType: SalaryType | null;
  workingDays: number | null;
  overtimeRate: number | null;
  pfEsiApplicable: boolean;
  joiningDate: Date | null;
}

export interface CompanyPayrollConfig {
  id: string;
  name: string;
  defaultSalaryType: SalaryType | null;
  overtimeMultiplier: number | null;
  enableLatePenalty: boolean;
  latePenaltyPerMinute: number | null;
  enableAbsentPenalty: boolean;
  halfDayThresholdHours: number | null;
  absentPenaltyPerDay: number | null;
  pfPercentage: number | null;
  esiPercentage: number | null;
  minWorkingHours: number | null;
  maxDailyHours: number | null;
  overtimeThresholdHours: number | null;
  shiftStartTime: string | null;
  gracePeriodMinutes: number | null;
}

// ============================================================================
// Validation Utilities
// ============================================================================

function validateMonth(month: number): void {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1 and 12.`);
  }
}

function validateYear(year: number): void {
  const currentYear = new Date().getFullYear() + 1;
  const minYear = currentYear - 10;
  if (year < minYear || year > currentYear) {
    throw new Error(
      `Invalid year: ${year}. Must be between ${minYear} and ${currentYear}.`,
    );
  }
}

function validatePositiveNumber(value: number, fieldName: string): void {
  if (value < 0) {
    throw new Error(`${fieldName} cannot be negative: ${value}`);
  }
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

// ============================================================================
// Salary Service Class
// ============================================================================

export class SalaryService {
  // ========================================================================
  // Public API Methods
  // ========================================================================

  /**
   * Calculate balance for a salary including ledger adjustments
   * Positive balance = Company owes employee (receivable)
   * Negative balance = Employee owes company (payable)
   */
  calculateSalaryBalance(
    salary: { netAmount: number },
    ledger: Array<{ type: string; amount: number }>,
  ): number {
    if (!salary || typeof salary.netAmount !== "number") {
      throw new Error("Invalid salary object provided");
    }

    const paid = ledger
      .filter((l) => l.type === "PAYMENT")
      .reduce((sum, l) => sum + (l.amount || 0), 0);

    // Balance = netAmount - payments
    // If netAmount > paid, company owes employee (positive)
    // If netAmount < paid, employee owes company (negative)
    return roundToTwoDecimals(salary.netAmount - paid);
  }

  /**
   * Generate salary for a user for a specific month
   * Idempotent operation - can be called multiple times safely
   */
  async generateSalary(
    input: SalaryCalculationInput,
  ): Promise<SalaryCalculationResult> {
    const { userId, companyId, month, year } = input;

    // Input validation
    if (!userId || typeof userId !== "string") {
      return { success: false, error: "Invalid user ID" };
    }
    if (!companyId || typeof companyId !== "string") {
      return { success: false, error: "Invalid company ID" };
    }
    validateMonth(month);
    validateYear(year);

    try {
      // Check if salary already exists and is locked
      const existingSalary = await prisma.salary.findUnique({
        where: { userId_month_year: { userId, month, year } },
        include: { breakdowns: true },
      });

      if (existingSalary?.lockedAt) {
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

      // Get user and company settings in parallel
      const [user, company] = await Promise.all([
        this.getUserSalaryConfig(userId),
        this.getCompanyPayrollConfig(companyId),
      ]);

      if (!user) {
        return { success: false, error: "User not found" };
      }
      if (!company) {
        return { success: false, error: "Company not found" };
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

      // Determine if version should be incremented
      const shouldIncrementVersion =
        !existingSalary ||
        calculation.baseAmount !== existingSalary.baseAmount ||
        calculation.overtimeAmount !== existingSalary.overtimeAmount ||
        calculation.penaltyAmount !== existingSalary.penaltyAmount ||
        calculation.grossAmount !== existingSalary.grossAmount;

      const payableDays = this.calculatePayableDays(attendanceSummary);

      // Prepare salary data
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
        status: "PENDING" as const,
        version: shouldIncrementVersion
          ? (existingSalary?.version || 0) + 1
          : (existingSalary?.version ?? 1),
      };

      let salary: any;

      // Execute transaction
      await prisma.$transaction(async (tx) => {
        salary = await tx.salary.upsert({
          where: { userId_month_year: { userId, month, year } },
          update: salaryData,
          create: salaryData,
        });

        // Delete existing breakdowns
        await tx.salaryBreakdown.deleteMany({
          where: { salaryId: salary.id },
        });

        // Create new breakdowns
        await tx.salaryBreakdown.createMany({
          data: calculation.breakdowns.map((b) => ({
            salaryId: salary.id,
            type: b.type,
            description: b.description,
            amount: b.amount,
            hours: b.hours ?? null,
            quantity: b.quantity ?? null,
          })),
        });

        // Create audit log
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

      return {
        success: true,
        salary,
        breakdowns: calculation.breakdowns,
      };
    } catch (error) {
      console.error("Error generating salary:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred during salary generation",
      };
    }
  }

  /**
   * Approve a pending salary
   */
  async approveSalary(
    salaryId: string,
    approvedBy: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!salaryId || typeof salaryId !== "string") {
      return { success: false, error: "Invalid salary ID" };
    }
    if (!approvedBy || typeof approvedBy !== "string") {
      return { success: false, error: "Invalid approver ID" };
    }

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
          approvedAt: getCurrentTime(),
        },
      });

      await this.logSalaryAudit(salaryId, salary.userId, AuditAction.APPROVED, {
        approvedBy,
      });

      return { success: true };
    } catch (error) {
      console.error("Error approving salary:", error);
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
    if (!salaryId || typeof salaryId !== "string") {
      return { success: false, error: "Invalid salary ID" };
    }

    try {
      const salary = await prisma.salary.findFirst({
        where: {
          id: salaryId,
          status: "APPROVED",
        },
        include: {
          ledger: true,
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
        return { success: false, error: "Salary not found or not approved" };
      }

      if (salary.lockedAt) {
        return { success: false, error: "Salary is locked" };
      }

      const remainingBalance = this.calculateSalaryBalance(
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

      const currentTime = getCurrentTime();

      await prisma.salary.update({
        where: { id: salaryId },
        data: {
          status: "PAID",
          paidAt: paidAt || currentTime,
          lockedAt: currentTime,
        },
      });

      await this.logSalaryAudit(salaryId, salary.userId, AuditAction.UPDATED, {
        action: "MARKED_AS_PAID",
        paidAt: paidAt || currentTime,
      });

      return { success: true };
    } catch (error) {
      console.error("Error marking salary as paid:", error);
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
    if (!salaryId || typeof salaryId !== "string") {
      return { success: false, error: "Invalid salary ID" };
    }

    try {
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

      if (salary.status === "PAID") {
        return {
          success: false,
          error: "Paid salary cannot be recalculated",
        };
      }

      if (salary.lockedAt) {
        return {
          success: false,
          error: "Salary is locked and cannot be recalculated",
        };
      }

      const input: SalaryCalculationInput = {
        userId: salary.userId,
        companyId: salary.companyId,
        month: salary.month,
        year: salary.year,
      };

      const result = await this.generateSalary(input);

      if (result.success && salary.paidAt) {
        await this.logSalaryAudit(
          salaryId,
          salary.userId,
          AuditAction.UPDATED,
          {
            action: "RECALCULATED_AFTER_PAYMENT",
            reason: "Attendance correction",
          },
        );
      }

      return result;
    } catch (error) {
      console.error("Error recalculating salary:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
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
    skipped: boolean;
    processed: number;
    errors: string[];
  }> {
    validateMonth(month);
    validateYear(year);

    if (!companyId || typeof companyId !== "string") {
      return {
        success: false,
        skipped: false,
        processed: 0,
        errors: ["Invalid company ID"],
      };
    }

    try {
      const users = await prisma.user.findMany({
        where: {
          companyId,
          status: "ACTIVE",
          role: { in: ["STAFF", "MANAGER"] },
        },
        select: {
          id: true,
          salaries: {
            where: {
              month,
              year,
              status: { not: "PAID" as const },
              lockedAt: null,
            },
            select: { id: true },
          },
        },
      });

      let processed = 0;
      const errors: string[] = [];
      let skipped = false;

      // Process users in batches for better performance
      const batchSize = 10;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const batchPromises = batch.map(async (user) => {
          if (user.salaries.length === 0) {
            return { success: true, skipped: true };
          }
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
          if (result.skipped) {
            skipped = true;
            return;
          }
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
        skipped,
      };
    } catch (error) {
      console.error("Error in auto-generate salaries:", error);
      return {
        success: false,
        skipped: false,
        processed: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Get user salary configuration
   */
  private async getUserSalaryConfig(
    userId: string,
  ): Promise<UserSalaryConfig | null> {
    const user = await prisma.user.findUnique({
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
    });
    return user as UserSalaryConfig | null;
  }

  /**
   * Get company payroll configuration
   */
  private async getCompanyPayrollConfig(
    companyId: string,
  ): Promise<CompanyPayrollConfig | null> {
    const company = await prisma.company.findUnique({
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
        shiftStartTime: true,
        gracePeriodMinutes: true,
      },
    });
    return company as CompanyPayrollConfig | null;
  }

  /**
   * Calculate payable days based on attendance
   */
  private calculatePayableDays(attendance: AttendanceSummary): number {
    return roundToTwoDecimals(
      attendance.approvedDays - attendance.halfDays + attendance.halfDays * 0.5,
    );
  }

  /**
   * Get attendance summary for salary calculation
   */
  private async getAttendanceSummary(
    userId: string,
    user: UserSalaryConfig,
    companyId: string,
    month: number,
    year: number,
  ): Promise<AttendanceSummary> {
    const startDate = getDate(new Date(year, month - 1, 1));
    const endDate = getDate(new Date(year, month, 1));

    if (user.joiningDate) {
      const joinDate = new Date(user.joiningDate);
      if (joinDate > startDate) {
        startDate.setDate(joinDate.getDate());
      }
    }

    const company = await this.getCompanyPayrollConfig(companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        userId,
        companyId,
        attendanceDate: {
          gte: startDate,
          lt: endDate,
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
          isHalfDayOnly = !!(
            company.halfDayThresholdHours &&
            attendance.workingHours < company.halfDayThresholdHours
          );

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
        leavesDays++;
      } else if (attendance.status === AttendanceStatus.REJECTED) {
        rejectedDays++;
      } else if (attendance.status === AttendanceStatus.ABSENT) {
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
  private calculateSalaryComponents(
    user: UserSalaryConfig,
    company: CompanyPayrollConfig,
    salaryType: SalaryType,
    attendance: AttendanceSummary,
  ): SalaryComponents {
    const breakdowns: SalaryBreakdown[] = [];
    let baseAmount = 0;
    let overtimeAmount = 0;
    let penaltyAmount = 0;
    let deductions = 0;

    // Base salary calculation
    switch (salaryType) {
      case SalaryType.MONTHLY:
        baseAmount = this.calculateMonthlyBaseSalary(
          user,
          attendance,
          breakdowns,
        );
        break;
      case SalaryType.HOURLY:
        baseAmount = this.calculateHourlyBaseSalary(
          user,
          attendance,
          breakdowns,
        );
        break;
      case SalaryType.DAILY:
        baseAmount = this.calculateDailyBaseSalary(
          user,
          attendance,
          breakdowns,
        );
        break;
    }

    // Overtime calculation
    if (attendance.overtimeHours > 0) {
      overtimeAmount = this.calculateOvertime(
        user,
        company,
        salaryType,
        attendance,
        breakdowns,
      );
    }

    // Penalties
    if (
      attendance.lateMinutes > 0 &&
      company.enableLatePenalty &&
      company.latePenaltyPerMinute
    ) {
      const latePenalty = roundToTwoDecimals(
        attendance.lateMinutes * company.latePenaltyPerMinute,
      );
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
      const absentPenalty = roundToTwoDecimals(
        attendance.absentDays * company.absentPenaltyPerDay,
      );
      penaltyAmount += absentPenalty;
      breakdowns.push({
        type: "ABSENT_PENALTY",
        description: "Absent Days Penalty",
        amount: absentPenalty,
        quantity: attendance.absentDays,
      });
    }

    // Gross amount
    let grossAmount = roundToTwoDecimals(
      baseAmount + overtimeAmount - penaltyAmount,
    );

    // Statutory deductions
    if (user.pfEsiApplicable && grossAmount > 0) {
      if (company.pfPercentage) {
        const pfDeduction = roundToTwoDecimals(
          baseAmount * (company.pfPercentage / 100),
        );
        deductions += pfDeduction;
        breakdowns.push({
          type: "PF_DEDUCTION",
          description: "Provident Fund",
          amount: pfDeduction,
        });
      }

      if (company.esiPercentage) {
        const esiDeduction = roundToTwoDecimals(
          baseAmount * (company.esiPercentage / 100),
        );
        deductions += esiDeduction;
        breakdowns.push({
          type: "ESI_DEDUCTION",
          description: "Employee State Insurance",
          amount: esiDeduction,
        });
      }
    }

    const netAmount = Math.max(0, roundToTwoDecimals(grossAmount - deductions));

    return {
      baseAmount: roundToTwoDecimals(baseAmount),
      overtimeAmount,
      penaltyAmount: roundToTwoDecimals(penaltyAmount),
      deductions: roundToTwoDecimals(deductions),
      grossAmount,
      netAmount,
      breakdowns,
    };
  }

  /**
   * Calculate monthly base salary
   */
  private calculateMonthlyBaseSalary(
    user: UserSalaryConfig,
    attendance: AttendanceSummary,
    breakdowns: SalaryBreakdown[],
  ): number {
    if (user.baseSalary && user.workingDays) {
      const perDaySalary = user.baseSalary / user.workingDays;
      const payableDays = this.calculatePayableDays(attendance);
      const amount = roundToTwoDecimals(perDaySalary * payableDays);
      breakdowns.push({
        type: "BASE_SALARY",
        description: "Monthly Salary (Prorated)",
        amount,
        quantity: payableDays,
      });
      return amount;
    }
    return 0;
  }

  /**
   * Calculate hourly base salary
   */
  private calculateHourlyBaseSalary(
    user: UserSalaryConfig,
    attendance: AttendanceSummary,
    breakdowns: SalaryBreakdown[],
  ): number {
    if (user.hourlyRate) {
      const amount = roundToTwoDecimals(
        user.hourlyRate * attendance.workingHours,
      );
      breakdowns.push({
        type: "BASE_SALARY",
        description: `Hourly Rate (${user.hourlyRate}/hr)`,
        amount,
        hours: attendance.workingHours,
        quantity: attendance.approvedDays,
      });
      return amount;
    }
    return 0;
  }

  /**
   * Calculate daily base salary
   */
  private calculateDailyBaseSalary(
    user: UserSalaryConfig,
    attendance: AttendanceSummary,
    breakdowns: SalaryBreakdown[],
  ): number {
    if (user.dailyRate) {
      const fullDays = attendance.approvedDays - attendance.halfDays;
      const halfDayPay = (user.dailyRate / 2) * attendance.halfDays;
      const amount = roundToTwoDecimals(fullDays * user.dailyRate + halfDayPay);
      breakdowns.push({
        type: "BASE_SALARY",
        description: `Daily Rate (${user.dailyRate}/day)`,
        amount,
        quantity: attendance.approvedDays,
      });
      return amount;
    }
    return 0;
  }

  /**
   * Calculate overtime pay
   */
  private calculateOvertime(
    user: UserSalaryConfig,
    company: CompanyPayrollConfig,
    salaryType: SalaryType,
    attendance: AttendanceSummary,
    breakdowns: SalaryBreakdown[],
  ): number {
    if (attendance.overtimeHours <= 0) return 0;

    let baseHourlyRate = 0;

    // Calculate base hourly rate based on salary type
    switch (salaryType) {
      case SalaryType.HOURLY:
        if (user.hourlyRate) {
          baseHourlyRate = user.hourlyRate;
        }
        break;
      case SalaryType.DAILY:
        if (user.dailyRate && company.minWorkingHours) {
          baseHourlyRate = user.dailyRate / company.minWorkingHours;
        }
        break;
      case SalaryType.MONTHLY:
        if (user.baseSalary && user.workingDays && company.minWorkingHours) {
          baseHourlyRate =
            user.baseSalary / (user.workingDays * company.minWorkingHours);
        }
        break;
    }

    if (baseHourlyRate <= 0) return 0;

    const overtimeRate =
      user.overtimeRate ?? baseHourlyRate * (company.overtimeMultiplier ?? 1);
    const overtimePay = roundToTwoDecimals(
      overtimeRate * attendance.overtimeHours,
    );

    breakdowns.push({
      type: "OVERTIME",
      description: "Overtime Pay",
      amount: overtimePay,
      hours: attendance.overtimeHours,
      quantity: attendance.overtimeHours,
      rate: overtimeRate,
    });

    return overtimePay;
  }

  /**
   * Log salary audit trail
   */
  private async logSalaryAudit(
    salaryId: string,
    userId: string,
    action: AuditAction,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    const metaData = meta || {};

    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entity: "Salary",
          entityId: salaryId,
          salaryId,
          meta:
            Object.keys(metaData).length > 0 ? (metaData as any) : undefined,
        },
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Don't throw - audit logging should not block main operations
    }
  }
}

// Export singleton instance
export const salaryService = new SalaryService();

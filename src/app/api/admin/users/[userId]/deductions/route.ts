import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const companyId = session.user.companyId;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    const { cycle, recordDate, amount, description } = await request.json();

    if (!amount || !recordDate) {
      return NextResponse.json(
        { error: "Amount and record date are required" },
        { status: 400 },
      );
    }

    // Get current month salary record
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    let salary = await prisma.salary.findFirst({
      where: {
        userId,
        companyId,
        month: currentMonth,
        year: currentYear,
      },
    });

    // If no salary record exists, create one
    if (!salary) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { baseSalary: true, salaryType: true },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      salary = await prisma.salary.create({
        data: {
          userId,
          companyId,
          month: currentMonth,
          year: currentYear,
          baseAmount: user.baseSalary || 0,
          grossAmount: user.baseSalary || 0,
          netAmount: user.baseSalary || 0,
          type: user.salaryType || "MONTHLY",
        },
      });
    } else {
      // Check if salary is already paid or locked
      if (salary.status === "PAID") {
        return NextResponse.json(
          { error: "Cannot add deductions to a paid salary" },
          { status: 400 },
        );
      }

      if (salary.lockedAt) {
        return NextResponse.json(
          { error: "Cannot add deductions to a locked salary" },
          { status: 400 },
        );
      }
    }

    // Add deduction to ledger
    await prisma.salaryLedger.create({
      data: {
        salaryId: salary.id,
        userId,
        companyId,
        type: "DEDUCTION",
        amount: -Math.abs(parseFloat(amount)), // Negative for deductions
        reason: description || `Deduction (${cycle})`,
        createdBy: session.user.id,
      },
    });

    // Create cashbook entry for deduction (CREDIT - company receives money back)
    await prisma.cashbookEntry.create({
      data: {
        companyId,
        userId,
        transactionType: "EXPENSE", // Deductions are like expenses recovered
        direction: "CREDIT",
        amount: Math.abs(parseFloat(amount)),
        reference: salary.id,
        description: description || `Salary deduction (${cycle})`,
        notes: `Deduction cycle: ${cycle}`,
        transactionDate: new Date(recordDate),
        createdBy: session.user.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATED",
        entity: "SalaryBreakdown",
        entityId: salary.id,
        salaryId: salary.id,
        meta: {
          type: "DEDUCTION",
          amount: parseFloat(amount),
          cycle,
          description,
          cashbookEntry: true,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Deduction recorded successfully",
    });
  } catch (error) {
    console.error("Admin user deductions POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

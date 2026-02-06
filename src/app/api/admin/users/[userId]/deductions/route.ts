import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
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

    // 🔹 Determine month/year from the selected recordDate instead of current date
    const recordDateObj = getDate(new Date(recordDate));
    const currentMonth = recordDateObj.getMonth() + 1;
    const currentYear = recordDateObj.getFullYear();

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
    const parsedAmount = Math.abs(parseFloat(amount));

    await prisma.$transaction(async (tx) => {
      // 1️⃣ Create cashbook entry first
      const cashbookEntry = await tx.cashbookEntry.create({
        data: {
          companyId,
          userId,
          transactionType: "EXPENSE", // deduction = company recovers money
          direction: "CREDIT",
          amount: parsedAmount,
          reference: salary.id,
          description: description || `Salary deduction (${cycle})`,
          notes: `Deduction cycle: ${cycle}`,
          transactionDate: getDate(new Date(recordDate)),
          createdBy: session.user.id,
        },
      });

      await tx.salaryLedger.create({
        data: {
          salaryId: salary.id,
          userId,
          companyId,
          createdAt: getDate(new Date(recordDate)),
          type: "DEDUCTION",
          amount: -parsedAmount,
          reason: description || `Deduction (${cycle})`,
          cashbookEntryId: cashbookEntry.id,
          createdBy: session.user.id,
        },
      });
    });

    // Create audit log
    prisma.auditLog.create({
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

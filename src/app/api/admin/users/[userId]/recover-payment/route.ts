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
    const body = await request.json();
    const { amount, recoverDate, reason } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    const parsedAmount = Math.abs(parseFloat(amount));
    if (!parsedAmount || !recoverDate || !reason) {
      return NextResponse.json(
        { error: "Invalid or missing required fields" },
        { status: 400 },
      );
    }

    // 🔹 Verify user belongs to company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user || user.companyId !== companyId) {
      return NextResponse.json(
        { error: "User not found in your company" },
        { status: 404 },
      );
    }

    // 🔹 Determine month/year from the selected recoverDate instead of current date
    const recoverDateObj = getDate(new Date(recoverDate));
    const month = recoverDateObj.getMonth() + 1;
    const year = recoverDateObj.getFullYear();

    let salary = await prisma.salary.findFirst({
      where: { userId, companyId, month, year },
    });

    if (!salary) {
      const staff = await prisma.user.findUnique({
        where: { id: userId },
        select: { baseSalary: true, salaryType: true },
      });

      if (!staff) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      salary = await prisma.salary.create({
        data: {
          userId,
          companyId,
          month,
          year,
          baseAmount: staff.baseSalary || 0,
          grossAmount: staff.baseSalary || 0,
          netAmount: staff.baseSalary || 0,
          type: staff.salaryType || "MONTHLY",
        },
      });
    }

    // 🔥 MAIN FIX — TRANSACTION + LINK
    await prisma.$transaction(async (tx) => {
      // 1️⃣ Cashbook entry (money comes back to company)
      const cashbookEntry = await tx.cashbookEntry.create({
        data: {
          companyId,
          userId,
          transactionType: "RECOVERY",
          direction: "CREDIT",
          amount: parsedAmount,
          reference: salary!.id,
          description: `Payment recovery from staff: ${reason}`,
          notes: `Recovery date: ${recoverDate}`,
          transactionDate: getDate(new Date(recoverDate)),
          createdBy: session.user.id,
        },
      });

      // 2️⃣ Salary ledger (linked 🔗)
      await tx.salaryLedger.create({
        data: {
          salaryId: salary!.id,
          userId,
          createdAt: getDate(new Date(recoverDate)),
          companyId,
          type: "RECOVERY",
          amount: -parsedAmount, // 🔴 negative impact on salary
          reason: `Recovery (${recoverDate}): ${reason}`,
          cashbookEntryId: cashbookEntry.id, // ✅ LINK
          createdBy: session.user.id,
        },
      });
    });

    // 🔹 Audit log (fire & forget)
    prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: "CREATED",
          entity: "SalaryRecovery",
          entityId: salary.id,
          salaryId: salary.id,
          meta: {
            type: "RECOVERY",
            amount: parsedAmount,
            reason,
            recoverDate,
          },
        },
      })
      .catch(console.error);

    return NextResponse.json({
      message: "Payment recovered successfully",
    });
  } catch (error) {
    console.error("Admin recover payment POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const companyId = session.user.companyId;
    const { amount, recoverDate, reason } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    // Verify user belongs to admin's company
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

    if (!amount || !recoverDate || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get the current month salary
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Find the salary record for current month
    let salary = await prisma.salary.findFirst({
      where: {
        userId,
        companyId,
        month: currentMonth,
        year: currentYear,
      },
    });

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
    }

    // Create recovery entry in salary ledger
    await prisma.salaryLedger.create({
      data: {
        salaryId: salary.id,
        userId,
        companyId,
        type: "RECOVERY",
        amount: -Math.abs(parseFloat(amount)), // Negative amount for recovery
        reason: `Recovery (${recoverDate}): ${reason}`,
        createdBy: session.user.id,
      },
    });

    // Create cashbook entry for recovery (CREDIT - company receives money back)
    await prisma.cashbookEntry.create({
      data: {
        companyId,
        userId,
        transactionType: "RECOVERY",
        direction: "CREDIT",
        amount: Math.abs(parseFloat(amount)),
        reference: salary.id,
        description: `Payment recovery from staff: ${reason}`,
        notes: `Recovery date: ${recoverDate}`,
        transactionDate: new Date(recoverDate),
        createdBy: session.user.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATED",
        entity: "SalaryLedger",
        entityId: salary.id,
        salaryId: salary.id,
        meta: {
          type: "RECOVERY",
          amount: parseFloat(amount),
          reason,
          recoverDate,
          cashbookEntry: true,
        },
      },
    });

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

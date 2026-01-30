import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
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

    // Get current month salary record
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const salary = await prisma.salary.findFirst({
      where: {
        userId,
        companyId,
        month: currentMonth,
        year: currentYear,
      },
      include: {
        ledger: true,
      },
    });

    if (!salary) {
      return NextResponse.json({ payments: [] });
    }

    // Get payments from salary ledger
    const payments =
      salary.ledger?.filter((entry) => entry.type === "PAYMENT") || [];

    return NextResponse.json({
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        reason: payment.reason,
        createdAt: payment.createdAt.toISOString(),
        type: payment.type,
      })),
    });
  } catch (error) {
    console.error("Admin user payments GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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

    const body = await request.json();
    const { amount, mode, paymentDate, cycle, description, reference } = body;
    if (!amount || !paymentDate) {
      return NextResponse.json(
        { error: "Amount and record date are required" },
        { status: 400 },
      );
    }

    // Validate and map payment mode
    const validModes = ["CASH", "BANK", "UPI", "CHEQUE"];
    let paymentMode: "CASH" | "BANK" | "UPI" | "CHEQUE" = "BANK"; // default
    if (mode) {
      const upperMode = mode.toUpperCase();
      if (validModes.includes(upperMode)) {
        paymentMode = upperMode as "CASH" | "BANK" | "UPI" | "CHEQUE";
      } else if (upperMode === "ONLINE") {
        paymentMode = "BANK"; // Map online to bank
      } else {
        return NextResponse.json(
          {
            error:
              "Invalid payment mode. Must be one of: CASH, BANK, UPI, CHEQUE",
          },
          { status: 400 },
        );
      }
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
    }

    // Add payment to ledger
    await prisma.salaryLedger.create({
      data: {
        salaryId: salary.id,
        userId,
        companyId,
        type: "PAYMENT",
        amount: parseFloat(amount),
        reason: description || `Payment (${mode}) - Ref: ${reference || "N/A"}`,
        createdBy: session.user.id,
      },
    });

    // Create cashbook entry for payment (DEBIT - company gives money to staff)
    await prisma.cashbookEntry.create({
      data: {
        companyId,
        userId,
        transactionType: "ADVANCE", // Since this is additional payment beyond salary
        direction: "DEBIT",
        amount: parseFloat(amount),
        paymentMode,
        reference: salary.id,
        description:
          description || `Additional payment to staff (${paymentMode})`,
        notes: `Reference: ${reference || "N/A"}`,
        transactionDate: new Date(paymentDate),
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
          type: "PAYMENT",
          amount: parseFloat(amount),
          mode,
          cycle,
          description,
          cashbookEntry: true,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
    });
  } catch (error) {
    console.error("Admin user payments POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

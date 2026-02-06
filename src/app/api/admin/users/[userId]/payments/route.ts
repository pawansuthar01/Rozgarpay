import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

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
    const currentDate = getDate(new Date());
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
    const parsedAmount = Math.abs(parseFloat(amount));
    if (Number.isNaN(parsedAmount)) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // 🔹 Payment mode mapping
    const validModes = ["CASH", "BANK", "UPI", "CHEQUE"];
    let paymentMode: "CASH" | "BANK" | "UPI" | "CHEQUE" = "BANK";

    if (mode) {
      const upperMode = mode.toUpperCase();
      if (validModes.includes(upperMode)) {
        paymentMode = upperMode as any;
      } else if (upperMode === "ONLINE") {
        paymentMode = "BANK";
      } else {
        return NextResponse.json(
          { error: "Invalid payment mode" },
          { status: 400 },
        );
      }
    }

    // 🔹 Determine month/year from the selected paymentDate instead of current date
    const paymentDateObj = getDate(new Date(paymentDate));
    const month = paymentDateObj.getMonth() + 1;
    const year = paymentDateObj.getFullYear();

    let salary = await prisma.salary.findFirst({
      where: { userId, companyId, month, year },
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
          month,
          year,
          baseAmount: user.baseSalary || 0,
          grossAmount: user.baseSalary || 0,
          netAmount: user.baseSalary || 0,
          type: user.salaryType || "MONTHLY",
        },
      });
    }

    // 🔥 MAIN FIX — TRANSACTION WITH DIRECT LINK
    await prisma.$transaction(async (tx) => {
      // 1️⃣ Cashbook entry
      const cashbookEntry = await tx.cashbookEntry.create({
        data: {
          companyId,
          userId,
          transactionType: "ADVANCE",
          direction: "DEBIT",
          amount: parsedAmount,
          paymentMode,
          reference: salary!.id,
          description:
            description || `Additional payment to staff (${paymentMode})`,
          notes: `Reference: ${reference || "N/A"}`,
          transactionDate: getDate(new Date(paymentDate)),
          createdBy: session.user.id,
        },
      });

      // 2️⃣ Salary ledger (linked 🔗)
      await tx.salaryLedger.create({
        data: {
          salaryId: salary!.id,
          userId,
          companyId,
          type: "PAYMENT",
          createdAt: getDate(new Date(paymentDate)),
          amount: parsedAmount,
          reason:
            description ||
            `Payment (${paymentMode}) - Ref: ${reference || "N/A"}`,
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
          entity: "SalaryPayment",
          entityId: salary.id,
          salaryId: salary.id,
          meta: {
            type: "PAYMENT",
            amount: parsedAmount,
            mode,
            cycle,
          },
        },
      })
      .catch(console.error);

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

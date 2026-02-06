import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { salaryService } from "@/lib/salaryService";
import { authOptions } from "@/lib/auth";
import { PaymentMode } from "@prisma/client";
import { parseISTDate } from "@/lib/utils";
import { getDate } from "@/lib/attendanceUtils";

/**
 * Parse YYYY-MM-DD as IST-safe UTC date
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { salaryId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    const { salaryId } = params;

    if (
      !session ||
      !session.user.companyId ||
      !["ADMIN", "MANAGER"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, method, reference, sendNotification = false } = body;

    if (!date || !method) {
      return NextResponse.json(
        { error: "Payment date and method are required" },
        { status: 400 },
      );
    }

    const paymentMethod = method.toUpperCase() as PaymentMode;
    const validModes = ["CASH", "BANK", "UPI", "CHEQUE"];

    if (!validModes.includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment mode" },
        { status: 400 },
      );
    }

    const paymentDate = parseISTDate(date);

    // Admin + company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: { select: { id: true } } },
    });

    const companyId = admin?.company?.id;

    if (!companyId) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    // Fetch salary (must be APPROVED & unlocked)
    const salary = await prisma.salary.findFirst({
      where: {
        id: salaryId,
        status: "APPROVED",
        lockedAt: null,
        user: {
          companyId: companyId,
          role: "STAFF",
        },
      },
      include: {
        ledger: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!salary) {
      return NextResponse.json(
        { error: "Salary not found, not approved, or already paid" },
        { status: 404 },
      );
    }

    // Balance validation
    const remainingBalance = salaryService.calculateSalaryBalance(
      salary,
      salary.ledger,
    );

    if (remainingBalance <= 0) {
      return NextResponse.json(
        { error: "Salary already settled" },
        { status: 400 },
      );
    }

    const monthName = new Date(
      Date.UTC(2000, salary.month - 1, 1),
    ).toLocaleString("default", { month: "long" });

    // 🔒 ATOMIC TRANSACTION (NO DATA CORRUPTION)
    const updatedSalary = await prisma.$transaction(async (tx) => {
      // 1️⃣ Lock & mark salary as PAID
      const updated = await tx.salary.update({
        where: { id: salaryId },
        data: {
          status: "PAID",
          paidAt: paymentDate,
          lockedAt: new Date(),
        },
      });

      // 2️⃣ Cashbook entry
      const cashbook = await tx.cashbookEntry.create({
        data: {
          companyId: companyId,
          userId: salary.userId,
          transactionType: "SALARY_PAYMENT",
          direction: "DEBIT",
          amount: remainingBalance,
          paymentMode: paymentMethod,
          reference: salaryId,
          description: `Salary payment to ${salary.user.firstName} ${salary.user.lastName} for ${monthName} ${salary.year}`,
          notes: reference || undefined,
          transactionDate: getDate(new Date(date)),
          createdBy: session.user.id,
        },
      });

      // 3️⃣ Salary ledger (linked 🔗)
      await tx.salaryLedger.create({
        data: {
          salaryId,
          cashbookEntryId: cashbook.id,
          userId: salary.userId,
          companyId: companyId,
          type: "PAYMENT",
          amount: remainingBalance,
          reason: `Salary payment for ${monthName} ${salary.year}`,
          reference: reference || `Payment via ${paymentMethod}`,
          createdBy: session.user.id,
          createdAt: getDate(new Date(date)),
        },
      });

      return updated;
    });

    // 🔔 Audit log (non-blocking)
    prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: "UPDATED",
          entity: "Salary",
          entityId: salaryId,
          salaryId,
          meta: {
            action: "MARKED_AS_PAID",
            paymentDate: date,
            paymentMethod,
            amount: remainingBalance,
          },
        },
      })
      .catch(console.error);

    // 🔔 Optional notification
    if (sendNotification) {
      prisma.notification
        .create({
          data: {
            userId: salary.userId,
            companyId: companyId,
            title: "Salary Paid",
            message: `Your salary for ${monthName} ${salary.year} has been paid. Amount: ₹${remainingBalance.toLocaleString()}`,
            channel: "IN_APP",
            status: "PENDING",
            meta: {
              salaryId,
              month: salary.month,
              year: salary.year,
              amount: remainingBalance,
              paymentDate: date,
            },
          },
        })
        .catch(console.error);
    }

    return NextResponse.json({ salary: updatedSalary });
  } catch (error: any) {
    console.error("Admin salary mark-as-paid error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

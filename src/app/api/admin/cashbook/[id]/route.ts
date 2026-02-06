import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = params;

    if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      transactionType,
      direction,
      amount,
      paymentMode,
      reference,
      description,
      notes,
      transactionDate,
    } = body;

    if (!transactionType || !direction || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const parsedAmount = Math.abs(Number(amount));
    if (!parsedAmount || Number.isNaN(parsedAmount)) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    // 🔹 Admin company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // 🔹 Existing cashbook entry
    const existingEntry = await prisma.cashbookEntry.findFirst({
      where: { id, companyId: admin.companyId, isReversed: false },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Transaction not found or cannot be edited" },
        { status: 404 },
      );
    }

    // 🔹 Find linked salary ledger (NEW → OLD fallback)
    const linkedLedger =
      (await prisma.salaryLedger.findFirst({
        where: { cashbookEntryId: existingEntry.id },
      })) ??
      (existingEntry.reference && existingEntry.userId
        ? await prisma.salaryLedger.findFirst({
            where: {
              salaryId: existingEntry.reference,
              userId: existingEntry.userId,
            },
            orderBy: { createdAt: "desc" },
          })
        : null);

    // 🔒 Prevent dangerous edits
    if (linkedLedger && userId && userId !== existingEntry.userId) {
      return NextResponse.json(
        { error: "Cannot change user of salary-linked transaction" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Update cashbook
      const updatedEntry = await tx.cashbookEntry.update({
        where: { id },
        data: {
          userId,
          transactionType,
          direction,
          amount: parsedAmount,
          paymentMode,
          reference: linkedLedger ? existingEntry.reference : reference,
          description,
          notes,
          transactionDate: transactionDate
            ? new Date(transactionDate)
            : undefined,
        },
      });

      // 2️⃣ Update linked ledger (if exists)
      if (linkedLedger) {
        const ledgerAmount =
          direction === "DEBIT"
            ? Math.abs(parsedAmount)
            : -Math.abs(parsedAmount);

        await tx.salaryLedger.update({
          where: { id: linkedLedger.id },
          data: {
            amount: ledgerAmount,
            reason: description,
          },
        });
      }

      return updatedEntry;
    });

    // 🔹 Audit (fire & forget)
    prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: "UPDATED",
          entity: "CashbookEntry",
          entityId: id,
          meta: { transactionType, direction, amount: parsedAmount },
        },
      })
      .catch(console.error);

    return NextResponse.json({ entry: result });
  } catch (error) {
    console.error("Cashbook update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = params;

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔹 Fetch entry
    const entry = await prisma.cashbookEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // 🔹 Company ownership check
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId || admin.companyId !== entry.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.$transaction(async (tx) => {
      // 🔥 1️⃣ Delete linked salary ledger (NEW → OLD fallback)

      // New system (cashbookEntryId)
      await tx.salaryLedger.deleteMany({
        where: {
          cashbookEntryId: entry.id,
        },
      });

      // Old system fallback (salaryId + userId)
      if (entry.reference && entry.userId) {
        await tx.salaryLedger.deleteMany({
          where: {
            salaryId: entry.reference,
            userId: entry.userId,
          },
        });
      }

      // 🔥 2️⃣ Delete cashbook entry itself
      await tx.cashbookEntry.delete({
        where: { id: entry.id },
      });

      // 🔹 3️⃣ Audit log (recommended)
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETED",
          entity: "CashbookEntry",
          entityId: entry.id,
          meta: {
            hardDelete: true,
            amount: entry.amount,
            direction: entry.direction,
            transactionType: entry.transactionType,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Cashbook entry permanently deleted",
    });
  } catch (error) {
    console.error("Cashbook HARD delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

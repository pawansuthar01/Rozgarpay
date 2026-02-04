import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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

    // Validation
    if (!transactionType || !direction || !amount || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    // Get admin's company with minimal fields
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // Verify user if userId provided
    if (userId) {
      const user = await prisma.user.findFirst({
        where: { id: userId, companyId: admin.companyId },
        select: { id: true },
      });
      if (!user) {
        return NextResponse.json(
          { error: "User not found in company" },
          { status: 400 },
        );
      }
    }

    // Get existing transaction
    const existingEntry = await prisma.cashbookEntry.findFirst({
      where: { id, companyId: admin.companyId, isReversed: false },
      select: { id: true, reference: true, userId: true, amount: true },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Transaction not found or cannot be edited" },
        { status: 404 },
      );
    }

    // Check for linked ledger
    let linkedLedger = null;
    if (existingEntry.reference && existingEntry.userId) {
      linkedLedger = await prisma.salaryLedger.findFirst({
        where: {
          salaryId: existingEntry.reference,
          userId: existingEntry.userId,
        },
        select: { id: true, type: true },
      });
    }

    // Update with transaction
    const result = await prisma.$transaction(async (tx) => {
      const finalReference = linkedLedger ? existingEntry.reference : reference;

      const updatedEntry = await tx.cashbookEntry.update({
        where: { id },
        data: {
          userId,
          transactionType,
          direction,
          amount,
          paymentMode,
          reference: finalReference,
          description,
          notes,
          transactionDate: transactionDate
            ? new Date(transactionDate)
            : undefined,
        },
        select: {
          id: true,
          transactionType: true,
          direction: true,
          amount: true,
          description: true,
          transactionDate: true,
          isReversed: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });

      // Update linked ledger if amount changed
      if (linkedLedger && amount !== existingEntry.amount) {
        let ledgerAmount = amount;
        if (
          linkedLedger.type === "DEDUCTION" ||
          linkedLedger.type === "RECOVERY"
        ) {
          ledgerAmount = -Math.abs(amount);
        } else {
          ledgerAmount = Math.abs(amount);
        }
        await tx.salaryLedger.update({
          where: { id: linkedLedger.id },
          data: {
            amount: ledgerAmount,
            reason: `${linkedLedger.type}: ${description}`,
          },
        });
      }

      return updatedEntry;
    });

    // Fire-and-forget audit log
    prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: "UPDATED",
          entity: "CashbookEntry",
          entityId: id,
          meta: { transactionType, direction, amount, description },
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

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // Get existing transaction
    const existingEntry = await prisma.cashbookEntry.findFirst({
      where: { id, companyId: admin.companyId, isReversed: false },
      select: { id: true, reference: true, userId: true },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // Check for linked ledger
    let linkedLedger = null;
    if (existingEntry.reference && existingEntry.userId) {
      linkedLedger = await prisma.salaryLedger.findFirst({
        where: {
          salaryId: existingEntry.reference,
          userId: existingEntry.userId,
        },
        select: { id: true },
      });
    }

    // Delete with transaction
    await prisma.$transaction(async (tx) => {
      await tx.cashbookEntry.delete({ where: { id } });
      if (linkedLedger) {
        await tx.salaryLedger.delete({ where: { id: linkedLedger.id } });
      }
    });

    // Fire-and-forget audit log
    prisma.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: "DELETED",
          entity: "CashbookEntry",
          entityId: id,
        },
      })
      .catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cashbook delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

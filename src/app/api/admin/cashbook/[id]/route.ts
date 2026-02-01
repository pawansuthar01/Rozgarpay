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

    // Validate field lengths
    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 },
      );
    }

    if (notes && notes.length > 1000) {
      return NextResponse.json(
        { error: "Notes must be 1000 characters or less" },
        { status: 400 },
      );
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // If userId provided, verify they belong to the company
    if (userId) {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          companyId: admin.company.id,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found in company" },
          { status: 400 },
        );
      }
    }

    // Get the existing transaction
    const existingEntry = await prisma.cashbookEntry.findFirst({
      where: {
        id,
        companyId: admin.company.id,
        isReversed: false, // Can't edit reversed entries
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Transaction not found or cannot be edited" },
        { status: 404 },
      );
    }

    // Prevent changing reference for linked entries (once linked to user, reference cannot change)
    if (
      existingEntry.reference &&
      reference &&
      existingEntry.reference !== reference
    ) {
      return NextResponse.json(
        { error: "Cannot change reference for linked entries" },
        { status: 400 },
      );
    }

    // Check if there's a linked SalaryLedger entry via reference (reference = salaryId)
    let linkedLedger = null;
    if (existingEntry.reference && existingEntry.userId) {
      linkedLedger = await prisma.salaryLedger.findFirst({
        where: {
          salaryId: existingEntry.reference,
          userId: existingEntry.userId,
        },
      });
    }

    // Start a transaction to update both cashbook and ledger
    const result = await prisma.$transaction(async (tx) => {
      // For linked entries, preserve the original reference
      const finalReference = linkedLedger ? existingEntry.reference : reference;

      // Update the cashbook entry
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
            : existingEntry.transactionDate,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          creator: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // If there's a linked ledger and amount changed, update it too
      if (linkedLedger && amount !== existingEntry.amount) {
        // Determine the sign based on transaction type
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

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATED",
          entity: "CashbookEntry",
          entityId: id,
          meta: {
            userId,
            transactionType,
            direction,
            amount,
            description,
            linkedLedgerId: linkedLedger?.id || null,
            previousData: {
              userId: existingEntry.userId,
              transactionType: existingEntry.transactionType,
              direction: existingEntry.direction,
              amount: existingEntry.amount,
              description: existingEntry.description,
            },
          },
        },
      });

      return updatedEntry;
    });

    return NextResponse.json({ entry: result });
  } catch (error) {
    console.error("Cashbook update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = params;

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // Get the existing transaction
    const existingEntry = await prisma.cashbookEntry.findFirst({
      where: {
        id,
        companyId: admin.company.id,
        isReversed: false, // Can't delete reversed entries
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Transaction not found or cannot be deleted" },
        { status: 404 },
      );
    }

    // Check if there's a linked SalaryLedger entry (reference = salaryId)
    let linkedLedger = null;
    if (existingEntry.reference && existingEntry.userId) {
      linkedLedger = await prisma.salaryLedger.findFirst({
        where: {
          salaryId: existingEntry.reference,
          userId: existingEntry.userId,
        },
      });
    }

    // Start a transaction to delete both cashbook and ledger
    await prisma.$transaction(async (tx) => {
      // Delete the cashbook entry
      await tx.cashbookEntry.delete({
        where: { id },
      });

      // If there's a linked ledger, delete it too
      if (linkedLedger) {
        await tx.salaryLedger.delete({
          where: { id: linkedLedger.id },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETED",
          entity: "CashbookEntry",
          entityId: id,
          meta: {
            transactionType: existingEntry.transactionType,
            direction: existingEntry.direction,
            amount: existingEntry.amount,
            description: existingEntry.description,
            linkedLedgerId: linkedLedger?.id || null,
          },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cashbook delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

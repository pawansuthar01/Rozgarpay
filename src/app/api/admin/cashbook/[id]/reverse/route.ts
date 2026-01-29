import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

export async function POST(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reason, notes } = await request.json();

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required for reversal" },
        { status: 400 },
      );
    }

    // Get the original entry
    const originalEntry = await prisma.cashbookEntry.findFirst({
      where: {
        id,
        isReversed: false,
      },
    });

    if (!originalEntry) {
      return NextResponse.json(
        { error: "Entry not found or already reversed" },
        { status: 404 },
      );
    }

    // Verify admin owns the company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company || originalEntry.companyId !== admin.company.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create reversal entry (opposite direction)
    const reversalEntry = await prisma.cashbookEntry.create({
      data: {
        companyId: originalEntry.companyId,
        userId: originalEntry.userId,
        transactionType: "ADJUSTMENT",
        direction: originalEntry.direction === "CREDIT" ? "DEBIT" : "CREDIT",
        amount: originalEntry.amount,
        paymentMode: originalEntry.paymentMode,
        reference: `REVERSAL-${originalEntry.id}`,
        description: `Reversal: ${originalEntry.description}`,
        notes: `Reversal reason: ${reason}${notes ? ` - ${notes}` : ""}`,
        transactionDate: new Date(),
        createdBy: session.user.id,
        reversalOf: originalEntry.id,
      },
    });

    // Mark original entry as reversed
    await prisma.cashbookEntry.update({
      where: { id: originalEntry.id },
      data: { isReversed: true },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED",
        entity: "CashbookEntry",
        entityId: originalEntry.id,
        meta: {
          action: "REVERSED",
          reversalId: reversalEntry.id,
          reason,
          notes,
        },
      },
    });

    return NextResponse.json({
      originalEntry: { ...originalEntry, isReversed: true },
      reversalEntry,
    });
  } catch (error) {
    console.error("Cashbook reverse error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

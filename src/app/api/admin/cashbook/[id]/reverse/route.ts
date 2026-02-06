import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = params;

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

    // 🔹 Original cashbook entry
    const originalEntry = await prisma.cashbookEntry.findFirst({
      where: { id, isReversed: false },
    });

    if (!originalEntry) {
      return NextResponse.json(
        { error: "Entry not found or already reversed" },
        { status: 404 },
      );
    }

    // 🔹 Company ownership check
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId || admin.companyId !== originalEntry.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔹 Find linked salary ledger (NEW → OLD fallback)
    const linkedLedger =
      (await prisma.salaryLedger.findFirst({
        where: { cashbookEntryId: originalEntry.id },
      })) ??
      (originalEntry.reference && originalEntry.userId
        ? await prisma.salaryLedger.findFirst({
            where: {
              salaryId: originalEntry.reference,
              userId: originalEntry.userId,
            },
            orderBy: { createdAt: "desc" },
          })
        : null);

    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Create reversal cashbook entry
      const reversalEntry = await tx.cashbookEntry.create({
        data: {
          companyId: originalEntry.companyId,
          userId: originalEntry.userId,
          transactionType: "ADJUSTMENT",
          direction: originalEntry.direction === "CREDIT" ? "DEBIT" : "CREDIT",
          amount: originalEntry.amount,
          paymentMode: originalEntry.paymentMode,
          reference: originalEntry.reference ?? `REVERSAL-${originalEntry.id}`,
          description: `Reversal: ${originalEntry.description}`,
          notes: `Reversal reason: ${reason}${notes ? ` - ${notes}` : ""}`,
          transactionDate: getDate(new Date()),
          createdBy: session.user.id,
          reversalOf: originalEntry.id,
        },
      });

      // 2️⃣ Mark original entry reversed
      await tx.cashbookEntry.update({
        where: { id: originalEntry.id },
        data: { isReversed: true },
      });

      // 3️⃣ Reverse salary ledger (if linked)
      if (linkedLedger) {
        await tx.salaryLedger.create({
          data: {
            salaryId: linkedLedger.salaryId,
            userId: linkedLedger.userId,
            companyId: linkedLedger.companyId,
            type: linkedLedger.type,
            amount: -linkedLedger.amount, // 🔁 opposite impact
            reason: `Reversal: ${linkedLedger.reason}`,
            cashbookEntryId: reversalEntry.id, // 🔑 LINKED
            createdBy: session.user.id,
          },
        });
      }

      // 4️⃣ Audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATED",
          entity: "CashbookEntry",
          entityId: originalEntry.id,
          meta: {
            action: "REVERSED",
            reversalId: reversalEntry.id,
            linkedLedgerId: linkedLedger?.id || null,
            reason,
            notes,
          },
        },
      });

      return {
        originalEntry: { ...originalEntry, isReversed: true },
        reversalEntry,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cashbook reverse error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

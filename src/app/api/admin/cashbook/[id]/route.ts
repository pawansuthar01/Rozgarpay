import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = params;

    if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
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
        isReversed: false, // Can't edit reversed entries
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Transaction not found or cannot be edited" },
        { status: 404 },
      );
    }

    // Update the transaction
    const updatedEntry = await prisma.cashbookEntry.update({
      where: { id },
      data: {
        transactionType,
        direction,
        amount,
        paymentMode,
        reference,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED",
        entity: "CashbookEntry",
        entityId: id,
        meta: {
          transactionType,
          direction,
          amount,
          description,
          previousData: {
            transactionType: existingEntry.transactionType,
            direction: existingEntry.direction,
            amount: existingEntry.amount,
            description: existingEntry.description,
          },
        },
      },
    });

    return NextResponse.json({ entry: updatedEntry });
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

    // Delete the transaction
    await prisma.cashbookEntry.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
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
        },
      },
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

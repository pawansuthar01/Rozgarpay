import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { salaryService } from "@/lib/salaryService";
import { authOptions } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { salaryId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    const { salaryId } = params;

    if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let {
      date,
      method,
      reference,
      sendNotification = false,
    } = await request.json();
    method = method.toUpperCase();
    const validModes = ["CASH", "BANK", "UPI", "CHEQUE"];
    if (!validModes.includes(method)) {
      return NextResponse.json(
        {
          error:
            "Invalid payment mode. Must be one of: CASH, BANK, UPI, CHEQUE",
        },
        { status: 400 },
      );
    }
    if (!date) {
      return NextResponse.json(
        { error: "Payment date and method are required" },
        { status: 400 },
      );
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    // Get salary and verify it belongs to admin's company staff
    const salary = await prisma.salary.findFirst({
      where: {
        id: salaryId,
        user: {
          companyId: admin.company.id,
          role: "STAFF",
        },
        status: "APPROVED", // Only approved can be marked as paid
      },
      include: {
        ledger: true,

        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!salary) {
      return NextResponse.json(
        { error: "Salary not found or not approved" },
        { status: 404 },
      );
    }

    const remainingBalance = salaryService.calculateSalaryBalance(
      salary,
      salary.ledger,
    );

    if (remainingBalance <= 0) {
      return NextResponse.json(
        { error: "Salary already settled or overpaid" },
        { status: 400 },
      );
    }

    if (salary.netAmount > remainingBalance) {
      return NextResponse.json(
        { error: "Payment exceeds remaining salary balance" },
        { status: 400 },
      );
    }

    // Update salary
    const updatedSalary = await prisma.salary.update({
      where: { id: salaryId },
      data: {
        status: "PAID",
        paidAt: new Date(date),
      },
    });

    // Add salary ledger entry for the payment
    await prisma.salaryLedger.create({
      data: {
        salaryId: salaryId,
        userId: salary.userId,
        companyId: admin.company.id,
        type: "PAYMENT",
        amount: salary.netAmount,
        reason: `Salary payment for ${new Date(0, salary.month - 1).toLocaleString("default", { month: "long" })} ${salary.year}`,
        reference: reference || `Payment via ${method}`,
        createdBy: session.user.id,
      },
    });

    // Create cashbook entry for salary payment (DEBIT - company gives money)
    await prisma.cashbookEntry.create({
      data: {
        companyId: admin.company.id,
        userId: salary.userId,
        transactionType: "SALARY_PAYMENT",
        direction: "DEBIT",
        amount: salary.netAmount,
        paymentMode: method,
        reference: salaryId,
        description: `Salary payment to ${salary.user?.firstName || ""} ${salary.user?.lastName || ""} for ${new Date(0, salary.month - 1).toLocaleString("default", { month: "long" })} ${salary.year}`,
        notes: reference || `Payment reference: ${method}`,
        transactionDate: new Date(date),
        createdBy: session.user.id,
      },
    });

    // Generate PDF if not already present
    if (!updatedSalary.pdfUrl) {
      try {
        const pdfResult = await salaryService.recalculateSalary(salaryId);
        if (pdfResult.success && pdfResult.salary?.pdfUrl) {
          // Update the salary with PDF URL
          await prisma.salary.update({
            where: { id: salaryId },
            data: { pdfUrl: pdfResult.salary.pdfUrl },
          });
        }
      } catch (pdfError) {
        console.error("Failed to generate PDF for paid salary:", pdfError);
        // Don't fail the payment if PDF generation fails
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED",
        entity: "Salary",
        entityId: salaryId,
        salaryId: salaryId,
        meta: {
          action: "MARKED_AS_PAID",
          paymentDate: date,
          paymentMethod: method,
          paymentReference: reference,
        },
      },
    });

    // Send notification to staff if requested
    if (sendNotification) {
      await prisma.notification.create({
        data: {
          userId: salary.userId,
          companyId: admin.company.id,
          title: "Salary Payment Received",
          message: `Your salary for ${new Date(0, salary.month - 1).toLocaleString("default", { month: "long" })} ${salary.year} has been marked as paid. Amount: ₹${salary.netAmount.toLocaleString()}`,
          channel: "INAPP",
          status: "PENDING",
          meta: {
            salaryId: salaryId,
            amount: salary.netAmount,
            month: salary.month,
            year: salary.year,
            paymentDate: date,
          },
        },
      });
    }

    return NextResponse.json({ salary: updatedSalary });
  } catch (error) {
    console.error("Admin salary mark as paid error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

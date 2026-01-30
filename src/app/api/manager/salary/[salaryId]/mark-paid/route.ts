import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { salaryId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      date,
      method,
      reference,
      sendNotification = true,
    } = await request.json();

    if (!date || !method) {
      return NextResponse.json(
        { error: "Payment date and method are required" },
        { status: 400 },
      );
    }

    // Get manager's company
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!manager?.company) {
      return NextResponse.json(
        { error: "Manager company not found" },
        { status: 400 },
      );
    }

    // Get salary and verify it belongs to manager's company staff
    const salary = await prisma.salary.findFirst({
      where: {
        id: params.salaryId,
        user: {
          companyId: manager.company.id,
          role: "STAFF",
        },
        status: "APPROVED", // Only approved can be marked as paid
      },
    });

    if (!salary) {
      return NextResponse.json(
        { error: "Salary not found or not approved" },
        { status: 404 },
      );
    }

    // Update salary
    const updatedSalary = await prisma.salary.update({
      where: { id: params.salaryId },
      data: {
        status: "PAID",
        paidAt: new Date(date),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED",
        entity: "Salary",
        entityId: params.salaryId,
        salaryId: params.salaryId,
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
          companyId: manager.company.id,
          title: "Salary Payment Received",
          message: `Your salary for ${new Date(0, salary.month - 1).toLocaleString("default", { month: "long" })} ${salary.year} has been marked as paid. Amount: ₹${salary.netAmount.toLocaleString()}`,
          channel: "INAPP",
          status: "PENDING",
          meta: {
            salaryId: params.salaryId,
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
    console.error("Manager salary mark as paid error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

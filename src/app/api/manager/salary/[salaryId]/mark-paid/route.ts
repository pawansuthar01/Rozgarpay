import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

export async function POST(
  request: NextRequest,
  { params }: { params: { salaryId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, method, reference } = await request.json();

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

    return NextResponse.json({ salary: updatedSalary });
  } catch (error) {
    console.error("Manager salary mark as paid error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

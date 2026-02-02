import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

export async function POST(
  request: NextRequest,
  { params }: { params: { salaryId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { salaryId } = params;
    const { reason } = await request.json();

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
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
        status: "PENDING", // Only pending can be rejected
      },
    });

    if (!salary) {
      return NextResponse.json(
        { error: "Salary not found or not pending" },
        { status: 404 },
      );
    }

    // Update salary
    const updatedSalary = await prisma.salary.update({
      where: { id: salaryId },
      data: {
        status: "REJECTED",
        rejectedBy: session.user.id,
        rejectedAt: getDate(new Date()),
        rejectionReason: reason,
        lockedAt: getDate(new Date()), // Lock after rejection
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "REJECTED",
        entity: "Salary",
        entityId: salaryId,
        salaryId: salaryId,
        meta: { reason },
      },
    });

    return NextResponse.json({ salary: updatedSalary });
  } catch (error) {
    console.error("Admin salary reject error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

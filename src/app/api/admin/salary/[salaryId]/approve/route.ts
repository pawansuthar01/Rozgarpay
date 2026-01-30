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
    const { salaryId } = params;

    if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        status: "PENDING", // Only pending can be approved
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
        status: "APPROVED",
        approvedBy: session.user.id,
        approvedAt: new Date(),
        lockedAt: new Date(), // Lock after approval
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "APPROVED",
        entity: "Salary",
        entityId: salaryId,
        salaryId: salaryId,
      },
    });

    return NextResponse.json({ salary: updatedSalary });
  } catch (error) {
    console.error("Admin salary approve error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

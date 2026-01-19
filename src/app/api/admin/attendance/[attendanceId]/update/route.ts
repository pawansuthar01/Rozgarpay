import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ attendanceId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attendanceId } = await params;
    const body = await request.json();
    const {
      overtimeHours,
      workingHours,
      isLate,
      approvalReason,
      shiftDurationHours,
    } = body;

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

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance || attendance.companyId !== admin.company.id) {
      return NextResponse.json(
        { error: "Attendance not found" },
        { status: 404 },
      );
    }

    // Update attendance with additional details
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        overtimeHours:
          overtimeHours !== undefined && overtimeHours !== null
            ? Math.round(parseFloat(overtimeHours.toString()) * 100) / 100
            : undefined,
        workingHours:
          workingHours !== undefined && workingHours !== null
            ? Math.round(parseFloat(workingHours.toString()) * 100) / 100
            : undefined,
        shiftDurationHours:
          shiftDurationHours !== undefined && shiftDurationHours !== null
            ? Math.round(parseFloat(shiftDurationHours.toString()) * 100) / 100
            : undefined,
        isLate: isLate !== undefined ? Boolean(isLate) : undefined,
        approvalReason: approvalReason || undefined,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED",
        entity: "Attendance",
        entityId: attendanceId,
        meta: {
          updates: {
            overtimeHours,
            workingHours,
            shiftDurationHours,
            isLate,
            approvalReason,
          },
        },
      },
    });

    return NextResponse.json({ attendance: updatedAttendance });
  } catch (error) {
    console.error("Attendance update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

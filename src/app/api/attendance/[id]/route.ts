import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";
import { notificationManager } from "@/lib/notificationService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["MANAGER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json();

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const attendanceId = (await params).id;
    const companyId = session.user.companyId;

    if (!companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance || attendance.companyId !== companyId) {
      return NextResponse.json(
        { error: "Attendance not found" },
        { status: 404 },
      );
    }

    if (attendance.status !== "PENDING") {
      return NextResponse.json(
        { error: "Attendance already processed" },
        { status: 400 },
      );
    }

    // ✅ Update attendance with approval info
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    // ✅ Generic audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: status === "APPROVED" ? "APPROVED" : "REJECTED",
          entity: "ATTENDANCE",
          entityId: attendanceId,
          meta: {
            previousStatus: attendance.status,
            newStatus: status,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Don't fail the request if audit log fails
    }

    // ✅ Send notification to STAFF
    await notificationManager.sendNotification(
      attendance.userId,
      "staff_manual",
      {
        title: "Attendance Update",
        message: `Your attendance has been ${status.toLowerCase()}.`,
      },
      ["whatsapp", "push"],
    );

    return NextResponse.json({ attendance: updatedAttendance });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

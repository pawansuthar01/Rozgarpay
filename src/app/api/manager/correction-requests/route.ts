import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["MANAGER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId!;

    const correctionRequests = await prisma.correctionRequest.findMany({
      where: {
        companyId,
        status: "PENDING",
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        attendance: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ correctionRequests });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["MANAGER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, status, approvedTime } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const correctionRequest = await prisma.correctionRequest.findUnique({
      where: { id },
      include: { attendance: true },
    });

    if (!correctionRequest || correctionRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Correction request not found or not pending" },
        { status: 404 },
      );
    }

    const userId = session.user.id;

    // Update correction request
    const updatedRequest = await prisma.correctionRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    if (status === "APPROVED") {
      // Update attendance based on type
      if (correctionRequest.type === "MISSED_PUNCH_IN") {
        await prisma.attendance.update({
          where: { id: correctionRequest.attendanceId! },
          data: {
            punchIn: approvedTime
              ? new Date(approvedTime)
              : correctionRequest.requestedTime,
            status: "APPROVED",
            approvedBy: userId,
            approvedAt: new Date(),
          },
        });
      } else if (correctionRequest.type === "MISSED_PUNCH_OUT") {
        await prisma.attendance.update({
          where: { id: correctionRequest.attendanceId! },
          data: {
            punchOut: approvedTime
              ? new Date(approvedTime)
              : correctionRequest.requestedTime,
            status: "APPROVED",
            approvedBy: userId,
            approvedAt: new Date(),
          },
        });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: status === "APPROVED" ? "APPROVED" : "REJECTED",
        entity: "CORRECTION_REQUEST",
        entityId: id,
      },
    });

    // Notify staff
    await prisma.notification.create({
      data: {
        userId: correctionRequest.userId,
        companyId: correctionRequest.companyId,
        title: `Correction Request ${status.toLowerCase()}`,
        message: `Your correction request for ${correctionRequest.attendanceDate.toDateString()} has been ${status.toLowerCase()}`,
        channel: "INAPP",
      },
    });

    return NextResponse.json({ correctionRequest: updatedRequest });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

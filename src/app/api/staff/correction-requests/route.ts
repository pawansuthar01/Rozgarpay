import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attendanceDate, type, requestedTime, reason, evidence } =
      await request.json();

    if (!attendanceDate || !type || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const date = new Date(attendanceDate);
    date.setHours(0, 0, 0, 0);

    // Check if date is not in future and not too old (7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    if (date > now || date < sevenDaysAgo) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const companyId = session.user.companyId!;

    // Check if correction request already exists for this date and type
    const existingRequest = await prisma.correctionRequest.findFirst({
      where: {
        userId,
        attendanceDate: date,
        type,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "Correction request already exists" },
        { status: 400 },
      );
    }

    // Find or create attendance record
    let attendance = await prisma.attendance.findUnique({
      where: {
        userId_attendanceDate: {
          userId,
          attendanceDate: date,
        },
      },
    });

    if (!attendance) {
      attendance = await prisma.attendance.create({
        data: {
          userId,
          companyId,
          attendanceDate: date,
          imageUrl: "", // Placeholder
        },
      });
    }

    // Create correction request
    const correctionRequest = await prisma.correctionRequest.create({
      data: {
        userId,
        companyId,
        attendanceId: attendance.id,
        attendanceDate: date,
        type,
        requestedTime: requestedTime ? new Date(requestedTime) : null,
        reason,
        evidence,
      },
    });

    // Create notification for managers
    const managers = await prisma.user.findMany({
      where: {
        companyId,
        role: { in: ["MANAGER", "ADMIN"] },
      },
    });

    for (const manager of managers) {
      await prisma.notification.create({
        data: {
          userId: manager.id,
          companyId,
          title: "New Correction Request",
          message: `Correction request submitted for ${date.toDateString()}`,
          channel: "INAPP",
          meta: {
            correctionRequestId: correctionRequest.id,
          },
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATED",
        entity: "CORRECTION_REQUEST",
        entityId: correctionRequest.id,
      },
    });

    return NextResponse.json({ correctionRequest });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const correctionRequests = await prisma.correctionRequest.findMany({
      where: { userId },
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

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      attendanceDate,
      endDate,
      type,
      requestedTime,
      requestedAmount,
      reason,
      evidence,
    } = await request.json();

    if (!attendanceDate || !type || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate endDate for leave requests (optional for single day)
    if (
      type === "LEAVE_REQUEST" &&
      endDate &&
      new Date(endDate) < new Date(attendanceDate)
    ) {
      return NextResponse.json(
        { error: "End date cannot be before start date" },
        { status: 400 },
      );
    }

    // Validate requestedAmount for salary requests
    if (
      type === "SALARY_REQUEST" &&
      (!requestedAmount || requestedAmount <= 0)
    ) {
      return NextResponse.json(
        { error: "Valid amount is required for salary requests" },
        { status: 400 },
      );
    }

    const validTypes = [
      "MISSED_PUNCH_IN",
      "MISSED_PUNCH_OUT",
      "ATTENDANCE_MISS",
      "LEAVE_REQUEST",
      "SUPPORT_REQUEST",
      "SALARY_REQUEST",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid request type" },
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
        {
          error:
            " attendance is  already exist please content to admin or manager to change status...",
        },
        { status: 400 },
      );
    }

    // Find or create attendance record (only for attendance-related requests)
    let attendance = null;
    if (
      ["MISSED_PUNCH_IN", "MISSED_PUNCH_OUT", "ATTENDANCE_MISS"].includes(type)
    ) {
      attendance = await prisma.attendance.findUnique({
        where: {
          userId_companyId_attendanceDate: {
            userId,
            companyId,
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
            punchInImageUrl: "",
            punchOutImageUrl: "",
          },
        });
      }
    }

    // Create correction request
    const correctionRequest = await prisma.correctionRequest.create({
      data: {
        userId,
        companyId,
        attendanceId: attendance?.id || null,
        attendanceDate: date,
        endDate: endDate ? new Date(endDate) : null,
        type,
        requestedTime: requestedTime ? new Date(requestedTime) : null,
        requestedAmount: requestedAmount || null,
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
          channel: "WHATSAPP",
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

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { salaryService } from "@/lib/salaryService";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId!;
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Filters
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");

    const where: any = {
      companyId,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.attendanceDate = {};
      if (startDate) {
        where.attendanceDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.attendanceDate.lte = new Date(endDate);
      }
    }

    const [correctionRequests, total] = await Promise.all([
      prisma.correctionRequest.findMany({
        where,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
          attendance: true,
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.correctionRequest.count({ where }),
    ]);

    return NextResponse.json({
      correctionRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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

    const { id, status, approvedTime, reviewReason } = await request.json();

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
      include: {
        attendance: true,
        company: {
          select: {
            shiftEndTime: true,
            shiftStartTime: true,
            overtimeThresholdHours: true,
          },
        },
      },
    });

    if (!correctionRequest || correctionRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Correction request not found or not pending" },
        { status: 404 },
      );
    }

    const userId = session.user.id;

    let workingHours: number | undefined;
    if (status === "APPROVED") {
      // Calculate from shift start to end
      if (
        correctionRequest.company.shiftStartTime &&
        correctionRequest.company.shiftEndTime
      ) {
        const start = new Date(
          `1970-01-01T${correctionRequest.company.shiftStartTime}:00`,
        );
        const end = new Date(
          `1970-01-01T${correctionRequest.company.shiftEndTime}:00`,
        );
        const diffMs = end.getTime() - start.getTime();
        workingHours = Math.max(0, diffMs / (1000 * 60 * 60)); // hours
      }
    } else if (status === "ABSENT" || status === "LEAVE") {
      workingHours = 0;
    }
    if (status === "APPROVED") {
      // Update attendance based on type
      let updatedAttendance;
      if (correctionRequest.type === "MISSED_PUNCH_IN") {
        updatedAttendance = await prisma.attendance.update({
          where: { id: correctionRequest.attendanceId! },
          data: {
            punchIn: approvedTime
              ? new Date(approvedTime)
              : correctionRequest.requestedTime,
            status: "APPROVED",
            approvalReason: reviewReason,
            workingHours,
            approvedBy: userId,
            approvedAt: new Date(),
          },
        });
      } else if (correctionRequest.type === "MISSED_PUNCH_OUT") {
        updatedAttendance = await prisma.attendance.update({
          where: { id: correctionRequest.attendanceId! },
          data: {
            punchOut: approvedTime
              ? new Date(approvedTime)
              : correctionRequest.requestedTime,
            status: "APPROVED",
            approvalReason: reviewReason,
            workingHours,
            approvedBy: userId,
            approvedAt: new Date(),
          },
        });
      } else if (correctionRequest.type === "ATTENDANCE_MISS") {
        // Mark the attendance as approved (it was created as PENDING)
        updatedAttendance = await prisma.attendance.update({
          where: { id: correctionRequest.attendanceId! },
          data: {
            status: "APPROVED",
            approvalReason: reviewReason,
            workingHours,
            approvedBy: userId,
            approvedAt: new Date(),
          },
        });
      } else if (correctionRequest.type === "LEAVE_REQUEST") {
        // Create leave entries for each day in the range
        const startDate = new Date(correctionRequest.attendanceDate);
        const endDate = new Date(correctionRequest.endDate!);

        for (
          let date = new Date(startDate);
          date <= endDate;
          date.setDate(date.getDate() + 1)
        ) {
          const leaveDate = new Date(date);
          leaveDate.setHours(0, 0, 0, 0);

          // Check if attendance already exists for this date
          let attendance = await prisma.attendance.findUnique({
            where: {
              userId_companyId_attendanceDate: {
                userId: correctionRequest.userId,
                companyId: correctionRequest.companyId,
                attendanceDate: leaveDate,
              },
            },
          });

          if (!attendance) {
            // Create leave attendance record
            attendance = await prisma.attendance.create({
              data: {
                userId: correctionRequest.userId,
                companyId: correctionRequest.companyId,
                attendanceDate: leaveDate,
                status: "LEAVE",
                approvalReason: reviewReason,
                punchInImageUrl: "",
                punchOutImageUrl: "",
                approvedBy: userId,
                approvedAt: new Date(),
              },
            });
          } else {
            // Update existing attendance to leave
            await prisma.attendance.update({
              where: { id: attendance.id },
              data: {
                status: "LEAVE",
                approvalReason: reviewReason,
                approvedBy: userId,
                approvedAt: new Date(),
              },
            });
          }
        }
      }

      // Auto-recalculate salary if attendance was updated
      if (updatedAttendance) {
        try {
          const attendanceDate = new Date(updatedAttendance.attendanceDate);
          const currentMonth = attendanceDate.getMonth() + 1;
          const currentYear = attendanceDate.getFullYear();

          const existingSalary = await prisma.salary.findUnique({
            where: {
              userId_month_year: {
                userId: updatedAttendance.userId,
                month: currentMonth,
                year: currentYear,
              },
            },
          });

          if (
            existingSalary &&
            existingSalary.status !== "PAID" &&
            !existingSalary.lockedAt
          ) {
            console.log(
              `Auto-recalculating salary for user ${updatedAttendance.userId} - ${currentMonth}/${currentYear} due to correction approval`,
            );

            const recalcResult = await salaryService.recalculateSalary(
              existingSalary.id,
            );

            if (!recalcResult.success) {
              console.error(
                "Failed to auto-recalculate salary after correction:",
                recalcResult.error,
              );
            } else {
              console.log(
                `Successfully auto-recalculated salary for user ${updatedAttendance.userId} after correction approval`,
              );
            }
          }
        } catch (salaryError) {
          console.error(
            "Error during auto salary recalculation after correction:",
            salaryError,
          );
        }
      }
    }
    const updatedRequest = await prisma.correctionRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: status === "APPROVED" ? "APPROVED" : "REJECTED",
        entity: "CORRECTION_REQUEST",
        entityId: id,
      },
    });

    // Notify staff via in-app and WhatsApp
    const staffUser = await prisma.user.findUnique({
      where: { id: correctionRequest.userId },
      select: { phone: true, firstName: true, lastName: true },
    });

    const requestTypeLabel = correctionRequest.type
      .toLowerCase()
      .replace("_", " ");
    const notificationMessage = `Your ${requestTypeLabel} request for ${correctionRequest.attendanceDate.toDateString()} has been ${status.toLowerCase()}`;

    // In-app notification
    await prisma.notification.create({
      data: {
        userId: correctionRequest.userId,
        companyId: correctionRequest.companyId,
        title: `Request ${status.toLowerCase()}`,
        message: notificationMessage,
        channel: "IN_APP",
      },
    });

    // WhatsApp notification (if phone number available)
    if (staffUser?.phone) {
      await prisma.notification.create({
        data: {
          userId: correctionRequest.userId,
          companyId: correctionRequest.companyId,
          title: `Request ${status.toLowerCase()}`,
          message: `Hi ${staffUser.firstName} ${staffUser.lastName}, ${notificationMessage}`,
          channel: "WHATSAPP",
        },
      });
    }

    return NextResponse.json({ correctionRequest: updatedRequest });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

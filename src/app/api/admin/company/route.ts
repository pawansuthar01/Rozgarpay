import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
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

    const body = await request.json();

    // Update company with attendance settings
    const updatedCompany = await prisma.company.update({
      where: { id: admin.company.id },
      data: {
        shiftStartTime: body.shiftStartTime,
        shiftEndTime: body.shiftEndTime,
        gracePeriodMinutes: body.gracePeriodMinutes,
        minWorkingHours: body.minWorkingHours,
        maxDailyHours: body.maxDailyHours,
        autoPunchOutBufferMinutes: body.autoPunchOutBufferMinutes,
        locationLat: body.locationLat,
        locationLng: body.locationLng,
        locationRadius: body.locationRadius,
        overtimeThresholdHours: body.overtimeThresholdHours,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED",
        entity: "COMPANY",
        entityId: admin.company.id,
        meta: {
          type: "ATTENDANCE_SETTINGS_UPDATE",
          updatedFields: Object.keys(body),
        },
      },
    });

    return NextResponse.json({
      company: updatedCompany,
      message: "Attendance settings updated successfully",
    });
  } catch (error) {
    console.error("Company update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
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

    return NextResponse.json({
      company: admin.company,
    });
  } catch (error) {
    console.error("Company fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

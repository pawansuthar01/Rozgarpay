import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCompanySettings,
  getAutoPunchOutTime,
  isNightShift,
} from "@/lib/attendanceUtils";

// This endpoint should be called by a cron job every 10-15 minutes
export async function POST(request: NextRequest) {
  try {
    const now = new Date();

    // Get all companies
    const companies = await prisma.company.findMany({
      select: { id: true },
    });

    let totalAutoPunched = 0;

    for (const company of companies) {
      const companySettings = await getCompanySettings(company.id);

      // Find all open attendances for this company (not punched out)
      const openAttendances = await prisma.attendance.findMany({
        where: {
          companyId: company.id,
          punchOut: null,
          punchIn: { not: null },
          autoPunchOut: false, // Don't re-process already auto-punched
        },
      });

      for (const attendance of openAttendances) {
        // Calculate the auto punch-out time for this specific attendance
        const autoPunchOutTime = getAutoPunchOutTime(
          attendance.attendanceDate,
          companySettings.shiftStartTime,
          companySettings.shiftEndTime,
          companySettings.autoPunchOutBufferMinutes,
        );

        // Only auto punch-out if current time is past the auto punch-out time
        if (now < autoPunchOutTime) {
          continue; // Not yet time to auto punch-out this attendance
        }

        // Calculate working hours (from punch-in to auto punch-out time)
        const workingHours =
          (autoPunchOutTime.getTime() - attendance.punchIn!.getTime()) /
          (1000 * 60 * 60);

        await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            punchOut: autoPunchOutTime,
            autoPunchOut: true,
            status: "PENDING", // Not auto-approved, requires manager review
            workingHours,
            overtimeHours: 0, // Auto punch-out doesn't count overtime
            requiresApproval: true,
            approvalReason: "Auto punch-out - forgot to punch out",
          },
        });

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId: attendance.userId,
            action: "UPDATED",
            entity: "ATTENDANCE",
            entityId: attendance.id,
            meta: {
              type: "AUTO_PUNCH_OUT",
              autoPunchOutTime: autoPunchOutTime.toISOString(),
            },
          },
        });

        totalAutoPunched++;
      }
    }

    return NextResponse.json({
      message: `Auto punched out ${totalAutoPunched} attendances across ${companies.length} companies`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

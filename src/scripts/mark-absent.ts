import { prisma } from "../lib/prisma";
import { getAttendanceDate } from "../lib/attendanceUtils";
import { AttendanceStatus } from "@prisma/client";

/**
 * Mark absent attendances for staff who didn't punch in by end of shift
 * Runs daily after shift end time + buffer
 */
export async function markAbsentAttendances() {
  console.log("🔄 Starting absent marking process...");

  try {
    // Get all companies
    const companies = await prisma.company.findMany({
      select: { id: true },
    });

    let totalMarkedAbsent = 0;
    const now = new Date();

    for (const company of companies) {
      // Calculate yesterday's attendance date (since we mark absent after shift ends)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const attendanceDate = getAttendanceDate(yesterday);

      // Get all active staff in the company
      const activeStaff = await prisma.user.findMany({
        where: {
          companyId: company.id,
          role: "STAFF",
          status: "ACTIVE",
        },
        select: { id: true },
      });

      for (const staff of activeStaff) {
        // Check if staff already has attendance for this date
        const existingAttendance = await prisma.attendance.findUnique({
          where: {
            userId_companyId_attendanceDate: {
              userId: staff.id,
              companyId: company.id,
              attendanceDate,
            },
          },
        });

        if (!existingAttendance) {
          // No attendance record - mark as absent
          await prisma.attendance.create({
            data: {
              userId: staff.id,
              companyId: company.id,
              attendanceDate,
              status: AttendanceStatus.ABSENT,
              workingHours: 0,
              overtimeHours: 0,
              isLate: false,
            },
          });

          // Audit log
          await prisma.auditLog.create({
            data: {
              userId: staff.id,
              action: "CREATED",
              entity: "ATTENDANCE",
              entityId: `${staff.id}_${company.id}_${attendanceDate.toISOString()}`,
              meta: {
                type: "AUTO_ABSENT",
                reason: "No punch-in by end of shift",
              },
            },
          });

          totalMarkedAbsent++;
        }
      }
    }

    console.log(
      `🎉 Absent marking completed. Marked ${totalMarkedAbsent} attendances as absent across ${companies.length} companies`,
    );

    return {
      success: true,
      totalMarkedAbsent,
      companiesProcessed: companies.length,
    };
  } catch (error) {
    console.error("❌ Absent marking failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// For running as standalone script
if (require.main === module) {
  markAbsentAttendances()
    .then((result) => {
      console.log("Absent marking result:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Absent marking script failed:", error);
      process.exit(1);
    });
}

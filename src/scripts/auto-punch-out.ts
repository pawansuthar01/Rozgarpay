import { prisma } from "../lib/prisma";
import { getCompanySettings, getDate } from "../lib/attendanceUtils";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// Simple function to calculate auto punch-out time
function getAutoPunchOutTime(
  baseDate: Date,
  shiftStart: string,
  shiftEnd: string,
  bufferMinutes: number,
  timeZone = "Asia/Kolkata",
): Date {
  // baseDate is expected to be the UTC equivalent of local midnight for the timezone
  // Convert to local zoned time, set the punch out hour, then convert back to UTC
  const localBase = toZonedTime(baseDate, timeZone);
  const [endHour, endMinute] = shiftEnd.split(":").map(Number);
  localBase.setHours(endHour, endMinute + bufferMinutes, 0, 0);
  return fromZonedTime(localBase, timeZone);
}

/**
 * Auto punch-out cron job
 * Runs every 10-15 minutes to automatically punch out employees
 * who have forgotten to punch out after their shift ends
 */
export async function runAutoPunchOut() {
  console.log("🔄 Starting auto punch-out process...");

  try {
    // Get all companies
    const companies = await prisma.company.findMany({
      select: { id: true },
    });

    let totalAutoPunched = 0;
    const now = new Date();

    for (const company of companies) {
      const companySettings = await getCompanySettings(company.id);

      // Calculate auto punch-out time for this company using Asia/Kolkata local date
      const attendanceDate = getDate(now); // returns UTC date corresponding to local midnight in IST

      const autoPunchOutTime = getAutoPunchOutTime(
        attendanceDate,
        companySettings.shiftStartTime,
        companySettings.shiftEndTime,
        companySettings.autoPunchOutBufferMinutes,
      );

      // Only process if current time is past auto punch-out time
      if (now < autoPunchOutTime) {
        console.log(
          `⏰ Too early for auto punch-out for company ${company.id}. Next run at ${autoPunchOutTime.toISOString()}`,
        );
        continue;
      }

      // Find all attendances for this company that:
      // 1. Have no punchOut (still open)
      // 2. Are from today or yesterday (to handle night shifts)
      // 3. Have punchIn time
      // 4. Are not already auto-punched
      const yesterday = new Date(attendanceDate);
      yesterday.setDate(yesterday.getDate() - 1);

      const openAttendances = await prisma.attendance.findMany({
        where: {
          companyId: company.id,
          punchOut: null,
          punchIn: { not: null },
          autoPunchOut: false, // Don't re-process already auto-punched
          OR: [
            { attendanceDate: attendanceDate }, // Today
            { attendanceDate: yesterday }, // Yesterday (for night shifts)
          ],
        },
      });

      console.log(
        `📊 Found ${openAttendances.length} open attendances for company ${company.id}`,
      );

      for (const attendance of openAttendances) {
        // Double-check: only auto punch-out if current time is past the auto punch-out time
        // This prevents premature auto punch-outs
        if (now < autoPunchOutTime) {
          continue;
        }

        // Calculate working hours (from punch-in to auto punch-out time)
        const workingHours =
          (autoPunchOutTime.getTime() - attendance.punchIn!.getTime()) /
          (1000 * 60 * 60);

        // Ensure working hours don't exceed max daily hours
        const finalWorkingHours = Math.min(
          workingHours,
          companySettings.maxDailyHours,
        );

        await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            punchOut: autoPunchOutTime,
            autoPunchOut: true,
            autoPunchedOut: true, // New field: mark as auto-punched
            autoPunchOutAt: autoPunchOutTime, // New field: timestamp
            status: "PENDING", // Requires manager review
            workingHours: finalWorkingHours,
            overtimeHours: 0, // Auto punch-out doesn't count overtime
            requiresApproval: true, // Flag for manager review
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
              reason: "Forgot to punch out - auto processed",
            },
          },
        });

        // TODO: Send notification to employee and manager
        // This would require notification system integration

        console.log(
          `✅ Auto punched out attendance ${attendance.id} for user ${attendance.userId}`,
        );
      }

      totalAutoPunched += openAttendances.length;
    }

    console.log(
      `🎉 Auto punch-out completed. Processed ${totalAutoPunched} attendances across ${companies.length} companies`,
    );

    return {
      success: true,
      totalAutoPunched,
      companiesProcessed: companies.length,
    };
  } catch (error) {
    console.error("❌ Auto punch-out failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// For running as standalone script
if (require.main === module) {
  runAutoPunchOut()
    .then((result) => {
      console.log("Auto punch-out result:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Auto punch-out script failed:", error);
      process.exit(1);
    });
}

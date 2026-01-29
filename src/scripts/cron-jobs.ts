import * as cron from "node-cron";
import { runAutoPunchOut } from "./auto-punch-out";

/**
 * Initialize and start all cron jobs for the attendance system
 */
export function startCronJobs() {
  console.log("🚀 Starting attendance cron jobs...");

  // Auto punch-out job - runs every 10 minutes
  // This ensures employees who forget to punch out get automatically punched out
  cron.schedule("*/10 * * * *", async () => {
    console.log("⏰ Cron: Running auto punch-out job");
    try {
      const result = await runAutoPunchOut();
      if (result.success) {
        console.log(
          `✅ Auto punch-out completed: ${result.totalAutoPunched} attendances processed`,
        );
      } else {
        console.error("❌ Auto punch-out failed:", result.error);
      }
    } catch (error) {
      console.error("❌ Auto punch-out job error:", error);
    }
  });

  console.log("✅ Attendance cron jobs initialized");
}

/**
 * Stop all cron jobs
 */
export function stopCronJobs() {
  console.log("🛑 Stopping attendance cron jobs...");
  // node-cron doesn't have a global stop, but we can destroy specific jobs if needed
}

/**
 * Manually trigger auto punch-out (for testing)
 */
export async function triggerAutoPunchOut() {
  console.log("🔧 Manually triggering auto punch-out...");
  return await runAutoPunchOut();
}

// For running as standalone script
if (require.main === module) {
  console.log("🎯 Starting cron jobs...");

  startCronJobs();

  // Keep the process running
  console.log("📡 Cron jobs are running. Press Ctrl+C to stop.");

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Received SIGINT, stopping cron jobs...");
    stopCronJobs();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n🛑 Received SIGTERM, stopping cron jobs...");
    stopCronJobs();
    process.exit(0);
  });
}

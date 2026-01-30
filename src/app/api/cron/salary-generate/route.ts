import { runAutoSalaryGeneration } from "@/lib/autoSalary";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cron endpoint for auto salary generation
 * Should be called daily and hourly by a cron scheduler
 * Example cron: 0 9 * * * curl -X POST https://yourapp.com/api/cron/salary-generate (daily)
 * Example cron: 0 * * * * curl -X POST https://yourapp.com/api/cron/salary-generate (hourly)
 */
export async function POST(request: NextRequest) {
  try {
    // Basic authentication check (optional - add your own auth)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("💰 Cron: Starting auto salary generation process");

    const result = await runAutoSalaryGeneration();

    return NextResponse.json({
      success: true,
      message: `Salary generation completed: ${result.totalProcessed} processed, ${result.totalErrors} errors`,
      data: result,
    });
  } catch (error) {
    console.error("❌ Cron auto salary generation failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// For testing - GET endpoint to manually trigger
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 },
    );
  }

  return POST(request);
}

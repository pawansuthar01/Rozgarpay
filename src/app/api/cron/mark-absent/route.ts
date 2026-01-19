import { NextRequest, NextResponse } from "next/server";
import { markAbsentAttendances } from "@/scripts/mark-absent";

/**
 * Cron endpoint for marking absent attendances
 * Should be called daily after shift end time + buffer
 * Example cron: 0 19 * * * curl -X POST https://yourapp.com/api/cron/mark-absent
 */
export async function POST(request: NextRequest) {
  try {
    // Basic authentication check (optional - add your own auth)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🚀 Cron: Starting absent marking process");

    const result = await markAbsentAttendances();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Marked ${result.totalMarkedAbsent} attendances as absent across ${result.companiesProcessed} companies`,
        data: result,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("❌ Cron mark absent failed:", error);
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

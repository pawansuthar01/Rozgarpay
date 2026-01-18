import { NextRequest, NextResponse } from "next/server";
import { runAutoPunchOut } from "@/scripts/auto-punch-out";

/**
 * Cron endpoint for auto punch-out
 * Should be called every 10-15 minutes by a cron scheduler
 * Example cron: *\/10 * * * * curl -X POST https://yourapp.com/api/cron/auto-punch-out
 */
export async function POST(request: NextRequest) {
  try {
    // Basic authentication check (optional - add your own auth)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🚀 Cron: Starting auto punch-out process");

    const result = await runAutoPunchOut();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Auto punched out ${result.totalAutoPunched} attendances across ${result.companiesProcessed} companies`,
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
    console.error("❌ Cron auto punch-out failed:", error);
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

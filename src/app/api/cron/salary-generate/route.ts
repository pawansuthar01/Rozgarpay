import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { salaryService } from "@/lib/salaryService";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Auto-generate salaries for all companies
 */
export async function runAutoSalaryGeneration() {
  console.log("🔄 Starting auto salary generation for all companies...");

  // Get current month for daily/hourly salary generation
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = currentMonth.getMonth() + 1; // JS months are 0-based
  const year = currentMonth.getFullYear();

  console.log(`📅 Generating salaries for ${month}/${year}`);

  // Get all active companies
  const companies = await prisma.company.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  let totalProcessed = 0;
  let totalErrors = 0;

  // Process companies in batches of 5 for better performance
  const batchSize = 5;
  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);
    const batchPromises = batch.map(async (company) => {
      try {
        console.log(`🏢 Processing company: ${company.name}`);

        const result = await salaryService.autoGenerateSalaries(
          company.id,
          month,
          year,
        );

        if (result.success) {
          console.log(
            `✅ ${company.name}: ${result.processed} salaries generated`,
          );

          // Send notifications to admins and managers
          await sendSalaryNotification(
            company.id,
            month,
            year,
            result.processed,
          );

          return { processed: result.processed, errors: 0 };
        } else {
          console.error(
            `❌ ${company.name}: Failed to generate salaries`,
            result.errors,
          );
          return { processed: 0, errors: 1 };
        }
      } catch (error) {
        console.error(`❌ Error processing company ${company.name}:`, error);
        return { processed: 0, errors: 1 };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach((result) => {
      totalProcessed += result.processed;
      totalErrors += result.errors;
    });
  }

  console.log(
    `🎯 Auto salary generation completed: ${totalProcessed} processed, ${totalErrors} errors`,
  );

  return { totalProcessed, totalErrors };
}

/**
 * Send in-app notifications to admins and managers when salaries are generated
 */
async function sendSalaryNotification(
  companyId: string,
  month: number,
  year: number,
  count: number,
) {
  try {
    // Get all admins and managers for the company
    const recipients = await prisma.user.findMany({
      where: {
        companyId,
        role: { in: ["ADMIN", "MANAGER"] },
        status: "ACTIVE",
      },
      select: { id: true },
    });

    // Create notifications
    const notifications = recipients.map((recipient) => ({
      userId: recipient.id,
      companyId,
      title: "Salary Report Generated",
      message: `Salary report for ${month}/${year} has been generated for ${count} staff members.`,
      channel: "INAPP" as const,
      status: "PENDING" as const,
      meta: { month, year, count },
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    console.log(`📬 Sent salary notifications to ${recipients.length} users`);
  } catch (error) {
    console.error("❌ Failed to send salary notifications:", error);
  }
}

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

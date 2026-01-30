import { prisma } from "./prisma";
import { salaryService } from "./salaryService";

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

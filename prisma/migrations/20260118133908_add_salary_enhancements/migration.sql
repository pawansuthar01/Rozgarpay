/*
  Warnings:

  - You are about to drop the column `approvedDays` on the `Salary` table. All the data in the column will be lost.
  - You are about to drop the column `totalDays` on the `Salary` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "SalaryType" ADD VALUE 'DAILY';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "salaryId" UUID;

-- AlterTable
ALTER TABLE "Salary" DROP COLUMN "approvedDays",
DROP COLUMN "totalDays",
ADD COLUMN     "absentDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" UUID,
ADD COLUMN     "baseAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "halfDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lateMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "overtimeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "penaltyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "recalculatedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" UUID,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "totalWorkingDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalWorkingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "absentPenaltyPerDay" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "defaultSalaryType" "SalaryType" DEFAULT 'MONTHLY',
ADD COLUMN     "esiPercentage" DOUBLE PRECISION DEFAULT 0.75,
ADD COLUMN     "halfDayThresholdHours" DOUBLE PRECISION DEFAULT 4.0,
ADD COLUMN     "latePenaltyPerMinute" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "overtimeMultiplier" DOUBLE PRECISION DEFAULT 1.5,
ADD COLUMN     "pfPercentage" DOUBLE PRECISION DEFAULT 12.0;

-- CreateTable
CREATE TABLE "salary_breakdowns" (
    "id" UUID NOT NULL,
    "salaryId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "hours" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_breakdowns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salary_breakdowns_salaryId_idx" ON "salary_breakdowns"("salaryId");

-- CreateIndex
CREATE INDEX "Salary_companyId_status_idx" ON "Salary"("companyId", "status");

-- AddForeignKey
ALTER TABLE "Salary" ADD CONSTRAINT "Salary_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salary" ADD CONSTRAINT "Salary_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_breakdowns" ADD CONSTRAINT "salary_breakdowns_salaryId_fkey" FOREIGN KEY ("salaryId") REFERENCES "Salary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_salaryId_fkey" FOREIGN KEY ("salaryId") REFERENCES "Salary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

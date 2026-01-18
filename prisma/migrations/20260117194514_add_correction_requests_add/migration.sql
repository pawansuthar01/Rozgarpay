-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "approvalReason" TEXT,
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

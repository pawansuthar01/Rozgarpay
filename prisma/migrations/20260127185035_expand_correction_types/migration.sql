-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CorrectionType" ADD VALUE 'ATTENDANCE_MISS';
ALTER TYPE "CorrectionType" ADD VALUE 'LEAVE_REQUEST';
ALTER TYPE "CorrectionType" ADD VALUE 'SUPPORT_REQUEST';
ALTER TYPE "CorrectionType" ADD VALUE 'SALARY_REQUEST';

-- AlterTable
ALTER TABLE "CorrectionRequest" ADD COLUMN     "reviewReason" TEXT;

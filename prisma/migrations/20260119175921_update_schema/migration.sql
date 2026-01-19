/*
  Warnings:

  - The values [HALF_DAY] on the enum `AttendanceStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AttendanceStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ABSENT', 'LEAVE');
ALTER TABLE "Attendance" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "CorrectionRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Attendance" ALTER COLUMN "status" TYPE "AttendanceStatus_new" USING ("status"::text::"AttendanceStatus_new");
ALTER TABLE "CorrectionRequest" ALTER COLUMN "status" TYPE "AttendanceStatus_new" USING ("status"::text::"AttendanceStatus_new");
ALTER TYPE "AttendanceStatus" RENAME TO "AttendanceStatus_old";
ALTER TYPE "AttendanceStatus_new" RENAME TO "AttendanceStatus";
DROP TYPE "AttendanceStatus_old";
ALTER TABLE "Attendance" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "CorrectionRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "shiftDurationHours" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "enableAbsentPenalty" BOOLEAN DEFAULT false,
ADD COLUMN     "enableLatePenalty" BOOLEAN DEFAULT false;

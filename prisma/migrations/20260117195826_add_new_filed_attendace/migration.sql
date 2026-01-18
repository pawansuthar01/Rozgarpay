-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "autoPunchOutAt" TIMESTAMP(3),
ADD COLUMN     "autoPunchedOut" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "nightPunchInWindowHours" DOUBLE PRECISION DEFAULT 2.0;

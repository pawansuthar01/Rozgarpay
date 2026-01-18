-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "isLate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overtimeHours" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "punchInLocation" JSONB,
ADD COLUMN     "punchOutLocation" JSONB,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "workingHours" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "autoPunchOutBufferMinutes" INTEGER DEFAULT 30,
ADD COLUMN     "gracePeriodMinutes" INTEGER DEFAULT 30,
ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION,
ADD COLUMN     "locationRadius" DOUBLE PRECISION DEFAULT 100.0,
ADD COLUMN     "maxDailyHours" DOUBLE PRECISION DEFAULT 16.0,
ADD COLUMN     "minWorkingHours" DOUBLE PRECISION DEFAULT 4.0,
ADD COLUMN     "overtimeThresholdHours" DOUBLE PRECISION DEFAULT 2.0,
ADD COLUMN     "shiftEndTime" TEXT DEFAULT '18:00',
ADD COLUMN     "shiftStartTime" TEXT DEFAULT '09:00';

-- CreateTable
CREATE TABLE "shift_configurations" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shift_configurations_companyId_name_key" ON "shift_configurations"("companyId", "name");

-- CreateIndex
CREATE INDEX "Attendance_companyId_status_idx" ON "Attendance"("companyId", "status");

-- AddForeignKey
ALTER TABLE "shift_configurations" ADD CONSTRAINT "shift_configurations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "CorrectionType" AS ENUM ('MISSED_PUNCH_IN', 'MISSED_PUNCH_OUT');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "autoPunchOut" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "punchIn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "correctionRequestId" UUID;

-- CreateTable
CREATE TABLE "CorrectionRequest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "attendanceId" UUID,
    "attendanceDate" DATE NOT NULL,
    "type" "CorrectionType" NOT NULL,
    "requestedTime" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "evidence" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorrectionRequest_companyId_status_idx" ON "CorrectionRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "CorrectionRequest_userId_attendanceDate_idx" ON "CorrectionRequest"("userId", "attendanceDate");

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_correctionRequestId_fkey" FOREIGN KEY ("correctionRequestId") REFERENCES "CorrectionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

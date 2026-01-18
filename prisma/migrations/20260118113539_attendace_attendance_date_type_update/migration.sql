/*
  Warnings:

  - Changed the type of `attendanceDate` on the `Attendance` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `attendanceDate` on the `CorrectionRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "attendanceDate",
ADD COLUMN     "attendanceDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CorrectionRequest" DROP COLUMN "attendanceDate",
ADD COLUMN     "attendanceDate" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Attendance_companyId_attendanceDate_idx" ON "Attendance"("companyId", "attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_companyId_attendanceDate_key" ON "Attendance"("userId", "companyId", "attendanceDate");

-- CreateIndex
CREATE INDEX "CorrectionRequest_userId_attendanceDate_idx" ON "CorrectionRequest"("userId", "attendanceDate");

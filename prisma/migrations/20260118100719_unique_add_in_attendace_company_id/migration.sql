/*
  Warnings:

  - A unique constraint covering the columns `[userId,companyId,attendanceDate]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Attendance_userId_attendanceDate_key";

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_companyId_attendanceDate_key" ON "Attendance"("userId", "companyId", "attendanceDate");

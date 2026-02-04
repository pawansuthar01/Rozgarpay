-- CreateIndex
CREATE INDEX "Attendance_userId_attendanceDate_idx" ON "Attendance"("userId", "attendanceDate");

-- CreateIndex
CREATE INDEX "Salary_userId_companyId_status_idx" ON "Salary"("userId", "companyId", "status");

-- CreateIndex
CREATE INDEX "salary_ledgers_userId_companyId_salaryId_idx" ON "salary_ledgers"("userId", "companyId", "salaryId");

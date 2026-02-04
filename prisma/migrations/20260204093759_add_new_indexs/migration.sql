-- CreateIndex
CREATE INDEX "Attendance_userId_status_attendanceDate_idx" ON "Attendance"("userId", "status", "attendanceDate");

-- CreateIndex
CREATE INDEX "Attendance_companyId_attendanceDate_status_idx" ON "Attendance"("companyId", "attendanceDate", "status");

-- CreateIndex
CREATE INDEX "Attendance_userId_companyId_idx" ON "Attendance"("userId", "companyId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "CorrectionRequest_companyId_createdAt_idx" ON "CorrectionRequest"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "CorrectionRequest_userId_status_idx" ON "CorrectionRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_companyId_createdAt_idx" ON "Notification"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Otp_phone_purpose_idx" ON "Otp"("phone", "purpose");

-- CreateIndex
CREATE INDEX "Otp_email_purpose_idx" ON "Otp"("email", "purpose");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "Report_companyId_type_idx" ON "Report"("companyId", "type");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "Salary_userId_status_idx" ON "Salary"("userId", "status");

-- CreateIndex
CREATE INDEX "Salary_companyId_year_month_idx" ON "Salary"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "cashbook_entries_createdAt_idx" ON "cashbook_entries"("createdAt");

-- CreateIndex
CREATE INDEX "cashbook_entries_companyId_transactionDate_direction_idx" ON "cashbook_entries"("companyId", "transactionDate", "direction");

-- CreateIndex
CREATE INDEX "company_invitations_companyId_idx" ON "company_invitations"("companyId");

-- CreateIndex
CREATE INDEX "company_invitations_email_idx" ON "company_invitations"("email");

-- CreateIndex
CREATE INDEX "salary_ledgers_createdAt_idx" ON "salary_ledgers"("createdAt");

-- CreateIndex
CREATE INDEX "users_companyId_status_idx" ON "users"("companyId", "status");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

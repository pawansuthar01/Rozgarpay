-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "LateMinute" INTEGER DEFAULT 0;

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "users_companyId_role_idx" ON "users"("companyId", "role");

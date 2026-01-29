-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_approvedBy_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_userId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_attendanceId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_correctionRequestId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_salaryId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "CorrectionRequest" DROP CONSTRAINT "CorrectionRequest_attendanceId_fkey";

-- DropForeignKey
ALTER TABLE "CorrectionRequest" DROP CONSTRAINT "CorrectionRequest_companyId_fkey";

-- DropForeignKey
ALTER TABLE "CorrectionRequest" DROP CONSTRAINT "CorrectionRequest_reviewedBy_fkey";

-- DropForeignKey
ALTER TABLE "CorrectionRequest" DROP CONSTRAINT "CorrectionRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "PushSubscription" DROP CONSTRAINT "PushSubscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Salary" DROP CONSTRAINT "Salary_approvedBy_fkey";

-- DropForeignKey
ALTER TABLE "Salary" DROP CONSTRAINT "Salary_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Salary" DROP CONSTRAINT "Salary_rejectedBy_fkey";

-- DropForeignKey
ALTER TABLE "Salary" DROP CONSTRAINT "Salary_userId_fkey";

-- DropForeignKey
ALTER TABLE "cashbook_entries" DROP CONSTRAINT "cashbook_entries_companyId_fkey";

-- DropForeignKey
ALTER TABLE "cashbook_entries" DROP CONSTRAINT "cashbook_entries_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "cashbook_entries" DROP CONSTRAINT "cashbook_entries_reversalOf_fkey";

-- DropForeignKey
ALTER TABLE "cashbook_entries" DROP CONSTRAINT "cashbook_entries_userId_fkey";

-- DropForeignKey
ALTER TABLE "company_invitations" DROP CONSTRAINT "company_invitations_companyId_fkey";

-- DropForeignKey
ALTER TABLE "salary_breakdowns" DROP CONSTRAINT "salary_breakdowns_salaryId_fkey";

-- DropForeignKey
ALTER TABLE "salary_ledgers" DROP CONSTRAINT "salary_ledgers_companyId_fkey";

-- DropForeignKey
ALTER TABLE "salary_ledgers" DROP CONSTRAINT "salary_ledgers_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "salary_ledgers" DROP CONSTRAINT "salary_ledgers_salaryId_fkey";

-- DropForeignKey
ALTER TABLE "salary_ledgers" DROP CONSTRAINT "salary_ledgers_userId_fkey";

-- DropForeignKey
ALTER TABLE "shift_configurations" DROP CONSTRAINT "shift_configurations_companyId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_companyId_fkey";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "logo" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profileImg" TEXT;

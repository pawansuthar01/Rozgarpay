-- AlterTable
ALTER TABLE "users" ADD COLUMN     "baseSalary" DOUBLE PRECISION,
ADD COLUMN     "dailyRate" DOUBLE PRECISION,
ADD COLUMN     "hourlyRate" DOUBLE PRECISION,
ADD COLUMN     "salaryType" "SalaryType" DEFAULT 'MONTHLY';

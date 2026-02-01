-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "salaryBlocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "pfEsiApplicable" SET DEFAULT false;

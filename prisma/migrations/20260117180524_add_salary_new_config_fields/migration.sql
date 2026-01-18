-- AlterTable
ALTER TABLE "users" ADD COLUMN     "joiningDate" TIMESTAMP(3),
ADD COLUMN     "overtimeRate" DOUBLE PRECISION,
ADD COLUMN     "pfEsiApplicable" BOOLEAN DEFAULT true,
ADD COLUMN     "workingDays" INTEGER DEFAULT 26;

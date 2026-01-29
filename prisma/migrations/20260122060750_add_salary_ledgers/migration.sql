-- CreateEnum
CREATE TYPE "SalaryLedgerType" AS ENUM ('PAYMENT', 'RECOVERY', 'EARNING', 'DEDUCTION');

-- CreateTable
CREATE TABLE "salary_ledgers" (
    "id" UUID NOT NULL,
    "salaryId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "type" "SalaryLedgerType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salary_ledgers_salaryId_idx" ON "salary_ledgers"("salaryId");

-- CreateIndex
CREATE INDEX "salary_ledgers_userId_idx" ON "salary_ledgers"("userId");

-- CreateIndex
CREATE INDEX "salary_ledgers_companyId_idx" ON "salary_ledgers"("companyId");

-- CreateIndex
CREATE INDEX "salary_ledgers_type_idx" ON "salary_ledgers"("type");

-- AddForeignKey
ALTER TABLE "salary_ledgers" ADD CONSTRAINT "salary_ledgers_salaryId_fkey" FOREIGN KEY ("salaryId") REFERENCES "Salary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_ledgers" ADD CONSTRAINT "salary_ledgers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_ledgers" ADD CONSTRAINT "salary_ledgers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_ledgers" ADD CONSTRAINT "salary_ledgers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

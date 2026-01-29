-- CreateEnum
CREATE TYPE "CashbookTransactionType" AS ENUM ('SALARY_PAYMENT', 'ADVANCE', 'RECOVERY', 'VENDOR_PAYMENT', 'CLIENT_PAYMENT', 'EXPENSE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CashbookDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'BANK', 'UPI', 'CHEQUE');

-- CreateTable
CREATE TABLE "cashbook_entries" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID,
    "transactionType" "CashbookTransactionType" NOT NULL,
    "direction" "CashbookDirection" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" "PaymentMode",
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,
    "reversalOf" UUID,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashbook_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cashbook_entries_companyId_transactionDate_idx" ON "cashbook_entries"("companyId", "transactionDate");

-- CreateIndex
CREATE INDEX "cashbook_entries_companyId_direction_idx" ON "cashbook_entries"("companyId", "direction");

-- CreateIndex
CREATE INDEX "cashbook_entries_companyId_userId_idx" ON "cashbook_entries"("companyId", "userId");

-- CreateIndex
CREATE INDEX "cashbook_entries_reference_idx" ON "cashbook_entries"("reference");

-- AddForeignKey
ALTER TABLE "cashbook_entries" ADD CONSTRAINT "cashbook_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashbook_entries" ADD CONSTRAINT "cashbook_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashbook_entries" ADD CONSTRAINT "cashbook_entries_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashbook_entries" ADD CONSTRAINT "cashbook_entries_reversalOf_fkey" FOREIGN KEY ("reversalOf") REFERENCES "cashbook_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

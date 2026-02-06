-- AlterTable
ALTER TABLE "salary_ledgers" ADD COLUMN     "cashbookEntryId" UUID;

-- CreateIndex
CREATE INDEX "salary_ledgers_cashbookEntryId_idx" ON "salary_ledgers"("cashbookEntryId");

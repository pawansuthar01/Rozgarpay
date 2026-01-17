/*
  Warnings:

  - You are about to drop the column `userId` on the `Otp` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Otp" DROP CONSTRAINT "Otp_userId_fkey";

-- DropIndex
DROP INDEX "Otp_expiresAt_idx";

-- DropIndex
DROP INDEX "Otp_phone_purpose_idx";

-- AlterTable
ALTER TABLE "Otp" DROP COLUMN "userId";

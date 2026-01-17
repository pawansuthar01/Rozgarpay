/*
  Warnings:

  - You are about to drop the column `otpHash` on the `Otp` table. All the data in the column will be lost.
  - Added the required column `otp` to the `Otp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Otp" DROP COLUMN "otpHash",
ADD COLUMN     "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryChannels" JSONB,
ADD COLUMN     "deliveryResults" JSONB,
ADD COLUMN     "deliveryStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN     "otp" TEXT NOT NULL;

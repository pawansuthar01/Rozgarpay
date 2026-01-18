/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Attendance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "imageUrl",
ADD COLUMN     "punchInImageUrl" TEXT,
ADD COLUMN     "punchOutImageUrl" TEXT;

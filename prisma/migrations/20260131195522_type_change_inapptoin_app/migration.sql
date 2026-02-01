/*
  Warnings:

  - The values [INAPP] on the enum `NotificationChannel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationChannel_new" AS ENUM ('EMAIL', 'IN_APP', 'WHATSAPP', 'PUSH');
ALTER TABLE "Notification" ALTER COLUMN "channel" TYPE "NotificationChannel_new" USING ("channel"::text::"NotificationChannel_new");
ALTER TYPE "NotificationChannel" RENAME TO "NotificationChannel_old";
ALTER TYPE "NotificationChannel_new" RENAME TO "NotificationChannel";
DROP TYPE "NotificationChannel_old";
COMMIT;

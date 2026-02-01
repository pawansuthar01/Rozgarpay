-- AlterTable
ALTER TABLE "Otp" ADD COLUMN     "email" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "otp_code" TEXT,
ADD COLUMN     "otp_expires_at" TIMESTAMP(3),
ADD COLUMN     "profile_image" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
ALTER COLUMN "is_active" SET DEFAULT false;

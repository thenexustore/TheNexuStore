-- Add tracking token column for public order tracking links

ALTER TABLE "Order"
ADD COLUMN "tracking_token" TEXT;

-- Backfill existing orders with a random token
UPDATE "Order"
SET "tracking_token" = md5(random()::text || clock_timestamp()::text)
WHERE "tracking_token" IS NULL;

-- Make the column required
ALTER TABLE "Order"
ALTER COLUMN "tracking_token" SET NOT NULL;

-- Ensure uniqueness of tracking tokens
CREATE UNIQUE INDEX "Order_tracking_token_key" ON "Order"("tracking_token");


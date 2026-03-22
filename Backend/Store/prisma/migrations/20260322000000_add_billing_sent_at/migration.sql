-- Add sent_at timestamp to billing_documents
-- Tracks when a document was last sent by email to the customer
ALTER TABLE "billing_documents" ADD COLUMN "sent_at" TIMESTAMP(3);

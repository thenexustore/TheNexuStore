-- Remove the unique constraint on billing_documents.order_id to allow
-- multiple billing documents (invoices, credit notes) per order.
-- The regular index billing_documents_order_id_idx is kept for performance.

DROP INDEX IF EXISTS "billing_documents_order_id_key";

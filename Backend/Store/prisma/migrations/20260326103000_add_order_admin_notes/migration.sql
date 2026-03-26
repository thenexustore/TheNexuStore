-- Persist admin order notes independently from audit logs
CREATE TABLE "order_admin_notes" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "author_staff_id" TEXT,
  "author_staff_email" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_admin_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_admin_notes_order_id_created_at_idx"
  ON "order_admin_notes"("order_id", "created_at" DESC);

ALTER TABLE "order_admin_notes"
  ADD CONSTRAINT "order_admin_notes_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

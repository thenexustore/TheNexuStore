DROP INDEX IF EXISTS "homepage_sections_type_key";

CREATE INDEX IF NOT EXISTS "homepage_sections_type_idx" ON "homepage_sections"("type");

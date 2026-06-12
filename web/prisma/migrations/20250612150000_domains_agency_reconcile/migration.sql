-- Reconcile Domain table to agency-scoped registry.
-- 20250612140000_domains was recorded applied with legacy userId+url unique index.

DROP INDEX IF EXISTS "Domain_userId_url_key";

ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "agencyId" TEXT;

UPDATE "Domain" d
SET "agencyId" = u."agencyId"
FROM "User" u
WHERE d."userId" = u.id
  AND d."agencyId" IS NULL
  AND u."agencyId" IS NOT NULL;

UPDATE "Domain" d
SET "agencyId" = a.id
FROM "Agency" a
WHERE d."agencyId" IS NULL
  AND a."ownerId" = d."userId";

ALTER TABLE "Domain" ALTER COLUMN "agencyId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Domain_agencyId_isActive_idx" ON "Domain"("agencyId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "Domain_agencyId_url_key" ON "Domain"("agencyId", "url");

ALTER TABLE "Domain" DROP CONSTRAINT IF EXISTS "Domain_agencyId_fkey";

ALTER TABLE "Domain"
    ADD CONSTRAINT "Domain_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

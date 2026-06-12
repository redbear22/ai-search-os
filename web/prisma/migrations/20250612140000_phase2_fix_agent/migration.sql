-- Phase 2 Fix Agent jobs + optional Domain.clientId link

CREATE TYPE "FixJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'NEEDS_APPROVAL', 'DONE', 'FAILED');

CREATE TABLE IF NOT EXISTS "fix_jobs" (
    "id" TEXT NOT NULL,
    "site_url" TEXT NOT NULL,
    "client_id" TEXT,
    "gap_id" TEXT,
    "status" "FixJobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT,
    "error" TEXT,
    "input" JSONB,
    "result" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fix_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fix_jobs_created_by_idx"
    ON "fix_jobs"("created_by");

CREATE INDEX IF NOT EXISTS "fix_jobs_client_id_idx"
    ON "fix_jobs"("client_id");

CREATE INDEX IF NOT EXISTS "fix_jobs_status_idx"
    ON "fix_jobs"("status");

ALTER TABLE "fix_jobs"
    ADD CONSTRAINT "fix_jobs_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "Client"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fix_jobs"
    ADD CONSTRAINT "fix_jobs_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

CREATE INDEX IF NOT EXISTS "Domain_clientId_idx" ON "Domain"("clientId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Domain_clientId_fkey'
    ) THEN
        ALTER TABLE "Domain"
            ADD CONSTRAINT "Domain_clientId_fkey"
            FOREIGN KEY ("clientId") REFERENCES "Client"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

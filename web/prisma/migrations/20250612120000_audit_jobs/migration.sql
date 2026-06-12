-- Agent API audit jobs (Postgres state of record for arq workers)

CREATE TYPE "AuditJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

CREATE TABLE IF NOT EXISTS "audit_jobs" (
    "id" TEXT NOT NULL,
    "site_url" TEXT NOT NULL,
    "client_id" TEXT,
    "status" "AuditJobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT,
    "error" TEXT,
    "result" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_jobs_created_by_idx"
    ON "audit_jobs"("created_by");

CREATE INDEX IF NOT EXISTS "audit_jobs_client_id_idx"
    ON "audit_jobs"("client_id");

CREATE INDEX IF NOT EXISTS "audit_jobs_status_idx"
    ON "audit_jobs"("status");

ALTER TABLE "audit_jobs"
    ADD CONSTRAINT "audit_jobs_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "Client"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_jobs"
    ADD CONSTRAINT "audit_jobs_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

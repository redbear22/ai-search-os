-- Citation Engine tables (shared Supabase Postgres with web app)

CREATE TABLE IF NOT EXISTS "citation_audit_runs" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL DEFAULT 'default',
    "project_profile_id" INTEGER NOT NULL DEFAULT 1,
    "keyword" TEXT NOT NULL,
    "report_json" JSONB NOT NULL,
    "win_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pages_audited" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT '',
    "gap_id" TEXT,
    "rubric_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citation_audit_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "citation_audit_runs_site_id_keyword_idx"
    ON "citation_audit_runs"("site_id", "keyword");

CREATE INDEX IF NOT EXISTS "citation_audit_runs_site_id_project_profile_id_created_at_idx"
    ON "citation_audit_runs"("site_id", "project_profile_id", "created_at");

CREATE TABLE IF NOT EXISTS "citation_content_ingest" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL DEFAULT 'default',
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citation_content_ingest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "citation_content_ingest_site_id_created_at_idx"
    ON "citation_content_ingest"("site_id", "created_at");

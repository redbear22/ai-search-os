-- Workflow persistence: audit metadata, gap fixes, task projects

ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "gapCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "isCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Gap" ADD COLUMN IF NOT EXISTS "auditId" TEXT;
ALTER TABLE "Gap" ADD COLUMN IF NOT EXISTS "fixGenerated" JSONB;

CREATE TABLE IF NOT EXISTS "TaskProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "gapId" TEXT,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "dueDate" TIMESTAMP(3),
    "estimatedTime" TEXT NOT NULL DEFAULT '',
    "assignedTo" TEXT,
    "suggestedActionPlan" TEXT NOT NULL DEFAULT '',
    "resourcesNeeded" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Audit_clientId_updatedAt_idx" ON "Audit"("clientId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Audit_userId_idx" ON "Audit"("userId");
CREATE INDEX IF NOT EXISTS "Gap_clientId_status_idx" ON "Gap"("clientId", "status");
CREATE INDEX IF NOT EXISTS "Gap_auditId_idx" ON "Gap"("auditId");
CREATE INDEX IF NOT EXISTS "TaskProject_clientId_sortOrder_idx" ON "TaskProject"("clientId", "sortOrder");
CREATE INDEX IF NOT EXISTS "Task_projectId_sortOrder_idx" ON "Task"("projectId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "Audit" ADD CONSTRAINT "Audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Gap" ADD CONSTRAINT "Gap_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TaskProject" ADD CONSTRAINT "TaskProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TaskProject" ADD CONSTRAINT "TaskProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TaskProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

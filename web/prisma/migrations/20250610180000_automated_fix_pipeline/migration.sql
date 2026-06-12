-- CreateTable
CREATE TABLE "FixPipelineRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "gapId" TEXT,
    "pipelineType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "currentStep" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "gapSnapshot" JSONB NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "followupAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "FixPipelineRun_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutonomousAuditConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "auditFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "optimizedFrequency" TEXT,
    "nextAuditAt" DATETIME,
    "lastAuditAt" DATETIME,
    "triggerCitationSpike" BOOLEAN NOT NULL DEFAULT true,
    "triggerPlatformRelease" BOOLEAN NOT NULL DEFAULT true,
    "triggerDomainChange" BOOLEAN NOT NULL DEFAULT true,
    "triggerWebhook" BOOLEAN NOT NULL DEFAULT true,
    "webhookSecret" TEXT,
    "autoAssign" BOOLEAN NOT NULL DEFAULT true,
    "notifyClient" BOOLEAN NOT NULL DEFAULT false,
    "lastKnownDomain" TEXT,
    "citationBaseline" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutonomousAuditConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutonomousAuditRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gapsDetected" INTEGER NOT NULL DEFAULT 0,
    "gapsAssigned" INTEGER NOT NULL DEFAULT 0,
    "gapsPrioritized" JSONB,
    "notifiedClient" BOOLEAN NOT NULL DEFAULT false,
    "assigneeId" TEXT,
    "auditId" TEXT,
    "intelligence" JSONB,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "AutonomousAuditRun_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GapFixLearning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "layer" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "patternKey" TEXT NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlatformReleaseEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "releasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "AutonomousAuditConfig_clientId_key" ON "AutonomousAuditConfig"("clientId");
CREATE UNIQUE INDEX "AutonomousAuditConfig_webhookSecret_key" ON "AutonomousAuditConfig"("webhookSecret");
CREATE UNIQUE INDEX "GapFixLearning_agencyId_patternKey_key" ON "GapFixLearning"("agencyId", "patternKey");

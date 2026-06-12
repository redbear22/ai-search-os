-- CreateTable
CREATE TABLE "AgencyBranding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL DEFAULT '#64748b',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "customDomain" TEXT,
    "favicon" TEXT,
    "portalName" TEXT,
    "reportHeader" TEXT,
    "reportFooter" TEXT,
    "features" JSONB NOT NULL DEFAULT '{"showRecommendations":true,"allowClientFeedback":true,"enableChat":false,"brandedEmails":false}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgencyBranding_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AgencyBranding_agencyId_key" ON "AgencyBranding"("agencyId");

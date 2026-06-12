-- Agency-scoped domain registry for subscription plan limits

CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "treatAsSeparate" BOOLEAN NOT NULL DEFAULT false,
    "separationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Domain_agencyId_url_key" ON "Domain"("agencyId", "url");
CREATE INDEX "Domain_agencyId_isActive_idx" ON "Domain"("agencyId", "isActive");

ALTER TABLE "Domain"
    ADD CONSTRAINT "Domain_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Domain"
    ADD CONSTRAINT "Domain_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

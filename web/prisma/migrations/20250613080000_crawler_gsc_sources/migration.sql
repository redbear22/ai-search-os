-- CreateTable
CREATE TABLE "CrawlerLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "siteUrl" TEXT NOT NULL,
    "crawlerBot" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "statusCode" INTEGER,
    "crawledAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlerSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "siteUrl" TEXT NOT NULL,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "crawledPages" INTEGER NOT NULL DEFAULT 0,
    "neverCrawled" JSONB,
    "lastAnalysed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" JSONB,

    CONSTRAINT "CrawlerSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GscConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GscConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "brand" TEXT,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrawlerLog_userId_idx" ON "CrawlerLog"("userId");

-- CreateIndex
CREATE INDEX "CrawlerLog_clientId_idx" ON "CrawlerLog"("clientId");

-- CreateIndex
CREATE INDEX "CrawlerLog_siteUrl_idx" ON "CrawlerLog"("siteUrl");

-- CreateIndex
CREATE INDEX "CrawlerSummary_userId_idx" ON "CrawlerSummary"("userId");

-- CreateIndex
CREATE INDEX "CrawlerSummary_siteUrl_idx" ON "CrawlerSummary"("siteUrl");

-- CreateIndex
CREATE UNIQUE INDEX "GscConnection_userId_key" ON "GscConnection"("userId");

-- CreateIndex
CREATE INDEX "GscConnection_userId_idx" ON "GscConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceCache_cacheKey_key" ON "SourceCache"("cacheKey");

-- CreateIndex
CREATE INDEX "SourceCache_cacheKey_expiresAt_idx" ON "SourceCache"("cacheKey", "expiresAt");

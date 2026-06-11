-- AlterTable
ALTER TABLE "ClientSettings" ADD COLUMN "agencyLogo" TEXT;
ALTER TABLE "ClientSettings" ADD COLUMN "brandColor" TEXT;
ALTER TABLE "ClientSettings" ADD COLUMN "reportFooterText" TEXT;
ALTER TABLE "ClientSettings" ADD COLUMN "emailReports" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientSettings" ADD COLUMN "nextReportAt" DATETIME;
ALTER TABLE "ClientSettings" ADD COLUMN "lastReportAt" DATETIME;

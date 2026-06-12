-- CreateTable
CREATE TABLE IF NOT EXISTS "abuse_tracking" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ip_address" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abuse_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "abuse_tracking_ip_address_created_at_idx" ON "abuse_tracking"("ip_address", "created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "abuse_tracking_action_idx" ON "abuse_tracking"("action");

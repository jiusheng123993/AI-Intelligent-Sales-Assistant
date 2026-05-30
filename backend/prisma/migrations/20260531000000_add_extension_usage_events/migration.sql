CREATE TABLE "ExtensionUsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "source" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER,
    "errorCode" TEXT,
    "pageHost" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtensionUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExtensionUsageEvent_userId_createdAt_idx" ON "ExtensionUsageEvent"("userId", "createdAt");
CREATE INDEX "ExtensionUsageEvent_teamId_createdAt_idx" ON "ExtensionUsageEvent"("teamId", "createdAt");
CREATE INDEX "ExtensionUsageEvent_source_createdAt_idx" ON "ExtensionUsageEvent"("source", "createdAt");
CREATE INDEX "ExtensionUsageEvent_mode_createdAt_idx" ON "ExtensionUsageEvent"("mode", "createdAt");
CREATE INDEX "ExtensionUsageEvent_status_createdAt_idx" ON "ExtensionUsageEvent"("status", "createdAt");

ALTER TABLE "ExtensionUsageEvent" ADD CONSTRAINT "ExtensionUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtensionUsageEvent" ADD CONSTRAINT "ExtensionUsageEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

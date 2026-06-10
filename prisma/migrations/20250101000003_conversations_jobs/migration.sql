-- Provider conversations & jobs

CREATE TABLE "provider_conversations" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "providerId"     TEXT NOT NULL,
  "telegramUserId" TEXT NOT NULL,
  "state"          TEXT NOT NULL DEFAULT 'idle',
  "lastMessageId"  TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_conversations_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE,
  CONSTRAINT "provider_conversations_providerId_telegramUserId_key" UNIQUE ("providerId", "telegramUserId")
);

CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'done', 'failed');

CREATE TABLE "provider_jobs" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "providerId" TEXT NOT NULL,
  "requestId"  TEXT NOT NULL,
  "status"     "JobStatus" NOT NULL DEFAULT 'pending',
  "payload"    JSONB NOT NULL,
  "response"   JSONB,
  "retries"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_jobs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE,
  CONSTRAINT "provider_jobs_requestId_fkey"  FOREIGN KEY ("requestId")  REFERENCES "provider_requests"("id") ON DELETE CASCADE
);

CREATE INDEX "provider_jobs_providerId_idx" ON "provider_jobs"("providerId");
CREATE INDEX "provider_jobs_status_idx"     ON "provider_jobs"("status");

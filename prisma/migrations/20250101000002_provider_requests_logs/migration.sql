-- Provider requests & logs migration

CREATE TYPE "ProviderRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE "provider_requests" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "providerId"   TEXT NOT NULL,
  "productId"    TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "requestType"  TEXT NOT NULL DEFAULT 'license',
  "status"       "ProviderRequestStatus" NOT NULL DEFAULT 'pending',
  "responseData" JSONB,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_requests_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id"),
  CONSTRAINT "provider_requests_productId_fkey"  FOREIGN KEY ("productId")  REFERENCES "products"("id"),
  CONSTRAINT "provider_requests_userId_fkey"     FOREIGN KEY ("userId")     REFERENCES "users"("id")
);

CREATE INDEX "provider_requests_providerId_idx" ON "provider_requests"("providerId");
CREATE INDEX "provider_requests_userId_idx"     ON "provider_requests"("userId");
CREATE INDEX "provider_requests_status_idx"     ON "provider_requests"("status");

CREATE TABLE "provider_logs" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "providerId" TEXT NOT NULL,
  "action"     TEXT NOT NULL,
  "request"    JSONB,
  "response"   JSONB,
  "error"      TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_logs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE
);

CREATE INDEX "provider_logs_providerId_idx" ON "provider_logs"("providerId");
CREATE INDEX "provider_logs_createdAt_idx"  ON "provider_logs"("createdAt");

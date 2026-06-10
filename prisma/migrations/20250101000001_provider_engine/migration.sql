-- Provider Engine migration

CREATE TYPE "ProviderType" AS ENUM ('telegram_bot', 'keyauth', 'auth_panel', 'rest_api');

CREATE TABLE "providers" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "type"      "ProviderType" NOT NULL,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "config"    JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "provider_products" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "providerId"   TEXT NOT NULL,
  "productId"    TEXT NOT NULL,
  "externalRef"  TEXT NOT NULL,
  "metadata"     JSONB,
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_products_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE,
  CONSTRAINT "provider_products_productId_fkey"  FOREIGN KEY ("productId")  REFERENCES "products"("id"),
  CONSTRAINT "provider_products_providerId_productId_key" UNIQUE ("providerId", "productId")
);

CREATE TABLE "provider_accounts" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "providerId"  TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "credentials" JSONB NOT NULL,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "provider_accounts_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE
);

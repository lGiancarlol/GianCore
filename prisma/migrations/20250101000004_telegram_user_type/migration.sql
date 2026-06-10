-- Add telegram_user to ProviderType enum
ALTER TYPE "ProviderType" ADD VALUE IF NOT EXISTS 'telegram_user';

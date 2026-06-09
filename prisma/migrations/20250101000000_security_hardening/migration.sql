-- Migration: security_hardening
-- Changes:
--   1. Add 'pending' to UserRole enum
--   2. Change default role from 'reseller' to 'pending'
--   3. Change User.active default to false
--   4. Change Wallet.balance from DOUBLE PRECISION to INTEGER
--   5. Change CreditTransaction.amount from DOUBLE PRECISION to INTEGER
--   6. Add CHECK constraint: wallets.balance >= 0

-- 1. Add 'pending' to the UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'pending';

-- 2. Change default role for new users
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'pending';

-- 3. Change User.active default to false (new Discord OAuth users start inactive)
ALTER TABLE "users" ALTER COLUMN "active" SET DEFAULT false;

-- 4. Change Wallet.balance from DOUBLE PRECISION to INTEGER
--    Round any existing fractional values
ALTER TABLE "wallets"
  ALTER COLUMN "balance" TYPE INTEGER USING ROUND("balance")::INTEGER;

ALTER TABLE "wallets"
  ALTER COLUMN "balance" SET DEFAULT 0;

-- 5. Change CreditTransaction.amount from DOUBLE PRECISION to INTEGER
ALTER TABLE "credit_transactions"
  ALTER COLUMN "amount" TYPE INTEGER USING ROUND("amount")::INTEGER;

-- 6. Add CHECK constraint to prevent negative balances
ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_balance_non_negative" CHECK ("balance" >= 0);

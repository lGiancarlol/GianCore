/**
 * Validates required environment variables at startup.
 * Call this from the app entry point (instrumentation.ts or layout.tsx server-side).
 * Throws if any value is missing or still set to the insecure default.
 */

const INSECURE_DEFAULTS = new Set([
  "change-me-to-a-random-secret-32chars",
  "change-me-to-a-random-secret",
  "secret",
  "changeme",
  "",
]);

function assertEnv(key: string): string {
  const value = process.env[key];
  if (!value || INSECURE_DEFAULTS.has(value)) {
    throw new Error(
      `[GianCore] Environment variable "${key}" is missing or set to an insecure default. ` +
      `Generate a secure value with: openssl rand -base64 32`,
    );
  }
  return value;
}

export function validateEnv(): void {
  assertEnv("NEXTAUTH_SECRET");
  assertEnv("API_TOKEN");
  assertEnv("DATABASE_URL");
}

// Auto-validate in production at runtime only (not during build)
if (process.env.NODE_ENV === "production" && typeof window === "undefined" && process.env.NEXT_PHASE !== "phase-production-build") {
  validateEnv();
}

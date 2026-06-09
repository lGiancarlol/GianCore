import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
}

export const config = {
  discord: {
    token:    required("DISCORD_TOKEN"),
    clientId: required("CLIENT_ID"),
  },
  api: {
    url:   required("API_URL").replace(/\/$/, ""),
    token: required("API_TOKEN"),
  },
  logLevel: (process.env.LOG_LEVEL ?? "info") as "debug" | "info" | "warn" | "error",
} as const;

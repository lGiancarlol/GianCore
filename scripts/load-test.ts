/**
 * scripts/load-test.ts
 *
 * Load test for the Voice Engine.
 * Usage:
 *   npx ts-node --esm scripts/load-test.ts [--url http://localhost:3000] [--concurrency 100]
 *
 * Requires:
 *   - GianCore running locally
 *   - API_TOKEN set in environment
 *   - A valid Discord channel ID configured via LOAD_TEST_CHANNEL_ID
 */

const BASE_URL    = process.env.LOAD_TEST_URL      ?? "http://localhost:3000";
const API_TOKEN   = process.env.API_TOKEN          ?? "change-me-to-a-random-secret";
const CHANNEL_ID  = process.env.LOAD_TEST_CHANNEL_ID ?? "test_channel_id";
const CONCURRENCY = parseInt(process.env.LOAD_TEST_CONCURRENCY ?? "100", 10);

interface JoinResult {
  userId:    string;
  ok:        boolean;
  status:    number;
  reason?:   string;
  licenseKey?: string;
  durationMs: number;
}

async function voiceJoin(userId: string, username: string): Promise<JoinResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/voice/join`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ channelId: CHANNEL_ID, userId, username }),
    });

    const body = await res.json() as any;
    return {
      userId,
      ok:         res.ok,
      status:     res.status,
      reason:     body?.error,
      licenseKey: body?.data?.license?.key,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { userId, ok: false, status: 0, reason: String(err), durationMs: Date.now() - start };
  }
}

async function run() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  GianCore Voice Engine — Load Test");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  URL:         ${BASE_URL}`);
  console.log(`  Channel:     ${CHANNEL_ID}`);
  console.log(`  Concurrency: ${CONCURRENCY} simultaneous requests`);
  console.log("═══════════════════════════════════════════════════\n");

  const totalStart = Date.now();

  // Fire CONCURRENCY requests simultaneously, each with a unique userId
  const results = await Promise.allSettled(
    Array.from({ length: CONCURRENCY }, (_, i) =>
      voiceJoin(`load_user_${i}`, `LoadUser${i}`)
    )
  );

  const totalMs = Date.now() - totalStart;

  const data = results
    .filter((r): r is PromiseFulfilledResult<JoinResult> => r.status === "fulfilled")
    .map((r) => r.value);

  const successes  = data.filter((r) => r.ok);
  const failures   = data.filter((r) => !r.ok);
  const errors     = results.filter((r) => r.status === "rejected");

  const durations  = data.map((r) => r.durationMs);
  const avgMs      = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const minMs      = durations.length ? Math.min(...durations) : 0;
  const maxMs      = durations.length ? Math.max(...durations) : 0;

  // Count unique error reasons
  const reasonCounts: Record<string, number> = {};
  failures.forEach((r) => {
    const key = r.reason ?? `HTTP ${r.status}`;
    reasonCounts[key] = (reasonCounts[key] ?? 0) + 1;
  });

  const licensesCreated = successes.filter((r) => r.licenseKey).length;

  console.log("RESULTS");
  console.log("───────────────────────────────────────────────────");
  console.log(`  Total requests:    ${CONCURRENCY}`);
  console.log(`  ✓ Successes:       ${successes.length}`);
  console.log(`  ✗ Failures:        ${failures.length}`);
  console.log(`  ✗ Network errors:  ${errors.length}`);
  console.log(`  Licenses created:  ${licensesCreated}`);
  console.log(`  Sessions created:  ${successes.length}`);
  console.log("");
  console.log("TIMING");
  console.log("───────────────────────────────────────────────────");
  console.log(`  Total time:  ${totalMs}ms`);
  console.log(`  Avg/request: ${avgMs}ms`);
  console.log(`  Min:         ${minMs}ms`);
  console.log(`  Max:         ${maxMs}ms`);

  if (Object.keys(reasonCounts).length > 0) {
    console.log("");
    console.log("FAILURE BREAKDOWN");
    console.log("───────────────────────────────────────────────────");
    Object.entries(reasonCounts).forEach(([reason, count]) => {
      console.log(`  ${reason.padEnd(30)} × ${count}`);
    });
  }

  console.log("\n═══════════════════════════════════════════════════");

  // Exit with error code if no sessions were created (system is down)
  if (successes.length === 0 && CONCURRENCY > 0) {
    console.error("\n  ⚠ WARNING: Zero successful joins. Is the server running?\n");
    process.exit(1);
  }
}

run().catch((err) => { console.error(err); process.exit(1); });

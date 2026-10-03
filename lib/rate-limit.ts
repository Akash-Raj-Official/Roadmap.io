/**
 * Best-effort in-memory rate limiter for auth actions (login/signup).
 *
 * Caveat: Vercel serverless functions don't share memory across instances or
 * regions, so this doesn't provide a hard global limit — a distributed
 * attacker can get more attempts than the number below by hitting different
 * instances. It still meaningfully raises the cost of unsophisticated
 * credential-stuffing/signup-spam scripts hitting a single warm instance,
 * which is the realistic threat on day one. For a hard guarantee, add
 * Vercel Firewall rate-limit rules (dashboard-configured, no code) or a
 * shared store (Upstash Redis) on top of this.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so this doesn't grow unbounded on a
// long-lived instance.
const SWEEP_INTERVAL_MS = 5 * 60_000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

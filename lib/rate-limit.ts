/**
 * A small fixed-window limiter for the API routes.
 *
 * Honest about what it is: the counters live in the memory of one serverless instance, so a
 * platform running several instances enforces roughly `limit x instances`, and a cold start
 * forgets everything. That is enough to stop a casual script from draining an AI budget or
 * hammering the register, and it is not enough to stop a determined attacker. A real
 * deployment puts this in front of the app (the platform's own WAF, or a shared store such as
 * Upstash/Redis) rather than relying on this.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

/** Best-effort client identity. Spoofable, which is another reason this is only a speed bump. */
export function clientKey(request: Request, scope: string): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "unknown";
  return `${scope}:${ip}`;
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    // Keep the map from growing without bound on a long-lived instance.
    if (buckets.size >= MAX_TRACKED_KEYS) {
      for (const [candidate, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(candidate);
      }
      if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    }
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return {
    ok: existing.count <= limit,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Standard headers so a client can back off politely instead of guessing. */
export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000))),
    ...(result.ok ? {} : { "Retry-After": String(result.retryAfterSeconds) }),
  };
}

/** Reads a JSON body with a hard byte ceiling, so one request cannot pin memory. */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, error: "Request body is too large" };
  }
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400, error: "Request body could not be read" };
  }
  // content-length can be absent or wrong, so the real text is measured too.
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return { ok: false, status: 413, error: "Request body is too large" };
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: "Expected a JSON object" };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
}

/** Testing seam; the limiter is module state. */
export function resetRateLimits() {
  buckets.clear();
}

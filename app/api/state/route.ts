import { NextResponse } from "next/server";
import { clientKey, rateLimit, rateLimitHeaders, readJsonBody } from "@/lib/rate-limit";
import { remoteSyncPolicy } from "@/lib/remote-sync-policy";

export const runtime = "nodejs";

/**
 * Optional Supabase mirror of the shared register.
 *
 * This route writes with the Supabase SERVICE ROLE key, which bypasses row-level security, so
 * an unauthenticated write here is a write to the database with no rules at all. The browser
 * is the only caller, and the browser holds no credential nobody else can obtain, so a
 * browser-authored write cannot be authenticated. There is no clever fix for that: it needs
 * real user identity, which this prototype does not have.
 *
 * So the route is closed by default. A deployment that wants the shared-demo convenience has
 * to opt in explicitly and accept that the mirrored workspace is world-writable. See
 * PRODUCTION_READINESS.md.
 */

const MAX_STATE_BYTES = 512 * 1024;
const READ_LIMIT = 60;
const WRITE_LIMIT = 20;
const WINDOW_MS = 60_000;

function config() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

function headers(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json", ...extra };
}

function validWorkspace(value: string | null) {
  return value && /^[a-z0-9-_]{1,64}$/i.test(value) ? value : null;
}

/**
 * A minimal shape gate. It does not make an untrusted write trustworthy — only identity could
 * — but it stops the mirror being used as free object storage for arbitrary blobs.
 */
function looksLikeRegister(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    v.schema === 1 &&
    Array.isArray(v.workers) &&
    Array.isArray(v.jobs) &&
    Array.isArray(v.receipts) &&
    typeof v.policy === "object" &&
    v.policy !== null
  );
}

export async function GET(request: Request) {
  const cfg = config();
  if (!cfg) return NextResponse.json({ state: null, mode: "local-only" });

  const limit = rateLimit(clientKey(request, "state-read"), READ_LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(limit, READ_LIMIT) },
    );
  }

  const workspace = validWorkspace(new URL(request.url).searchParams.get("workspace"));
  if (!workspace) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 });

  try {
    const response = await fetch(
      `${cfg.url}/rest/v1/kaamsabha_state?workspace=eq.${encodeURIComponent(workspace)}&select=state&limit=1`,
      { headers: headers(cfg.key), cache: "no-store" },
    );
    if (!response.ok) throw new Error("remote read failed");
    const rows = (await response.json()) as { state: unknown }[];
    return NextResponse.json(
      { state: rows[0]?.state ?? null, mode: "supabase-mirror" },
      { headers: rateLimitHeaders(limit, READ_LIMIT) },
    );
  } catch {
    return NextResponse.json({ state: null, mode: "local-fallback" });
  }
}

export async function POST(request: Request) {
  const cfg = config();
  if (!cfg) return NextResponse.json({ ok: false, mode: "local-only" }, { status: 503 });

  const policy = remoteSyncPolicy(process.env);
  if (!policy.writesAllowed) {
    // Fail closed. Returning 403 rather than silently dropping the write means a deployment
    // that thinks it is mirroring finds out immediately.
    return NextResponse.json(
      {
        ok: false,
        mode: "read-only-mirror",
        error: policy.reason,
      },
      { status: 403 },
    );
  }

  const limit = rateLimit(clientKey(request, "state-write"), WRITE_LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(limit, WRITE_LIMIT) },
    );
  }

  const parsed = await readJsonBody(request, MAX_STATE_BYTES);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });

  const workspace = typeof parsed.body.workspace === "string" ? validWorkspace(parsed.body.workspace) : null;
  const state = parsed.body.state;
  if (!workspace) return NextResponse.json({ ok: false, error: "workspace is required" }, { status: 400 });
  if (!looksLikeRegister(state)) {
    return NextResponse.json(
      { ok: false, error: "state must be a KaamSabha register (schema 1)" },
      { status: 400 },
    );
  }
  if (workspace !== policy.workspace) {
    return NextResponse.json(
      { ok: false, error: `This deployment only mirrors the "${policy.workspace}" workspace` },
      { status: 403 },
    );
  }

  try {
    const response = await fetch(`${cfg.url}/rest/v1/kaamsabha_state?on_conflict=workspace`, {
      method: "POST",
      headers: headers(cfg.key, {
        "content-type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({ workspace, state, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error("remote write failed");
    return NextResponse.json(
      { ok: true, mode: "supabase-mirror" },
      { headers: rateLimitHeaders(limit, WRITE_LIMIT) },
    );
  } catch {
    return NextResponse.json({ ok: false, mode: "local-fallback" }, { status: 503 });
  }
}

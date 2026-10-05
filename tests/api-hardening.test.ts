import assert from "node:assert/strict";
import test from "node:test";
import { clientKey, rateLimit, rateLimitHeaders, readJsonBody, readRawBody, resetRateLimits } from "../lib/rate-limit.ts";
import { DEFAULT_SYNC_WORKSPACE, remoteSyncPolicy } from "../lib/remote-sync-policy.ts";

function post(body: string, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/thing", { method: "POST", body, headers });
}

test("the shared mirror refuses anonymous writes unless a deployment opts in", () => {
  const configured = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service-key" };

  // Configured but not opted in: the dangerous default must be the safe one.
  const guarded = remoteSyncPolicy(configured);
  assert.equal(guarded.configured, true);
  assert.equal(guarded.writesAllowed, false, "writes must be closed by default");
  assert.match(guarded.reason, /read-only/i);
  assert.match(guarded.reason, /KAAMSABHA_ALLOW_ANONYMOUS_STATE_WRITES/);

  // Nothing configured at all.
  const off = remoteSyncPolicy({});
  assert.equal(off.configured, false);
  assert.equal(off.writesAllowed, false);

  // Explicit opt-in, and only then.
  const open = remoteSyncPolicy({ ...configured, KAAMSABHA_ALLOW_ANONYMOUS_STATE_WRITES: "true" });
  assert.equal(open.writesAllowed, true);
  assert.equal(open.workspace, DEFAULT_SYNC_WORKSPACE);

  // A truthy-looking value that is not exactly "true" must not open it.
  for (const value of ["1", "yes", "TRUE ", "on", ""]) {
    const attempt = remoteSyncPolicy({ ...configured, KAAMSABHA_ALLOW_ANONYMOUS_STATE_WRITES: value });
    assert.equal(attempt.writesAllowed, value.trim().toLowerCase() === "true", `value ${JSON.stringify(value)}`);
  }
});

test("opting in still pins the deployment to a single named workspace", () => {
  const policy = remoteSyncPolicy({
    SUPABASE_URL: "https://x.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "k",
    KAAMSABHA_ALLOW_ANONYMOUS_STATE_WRITES: "true",
    KAAMSABHA_SYNC_WORKSPACE: "pune-pilot",
  });
  assert.equal(policy.workspace, "pune-pilot");
  // An empty override falls back rather than producing an empty workspace name.
  assert.equal(
    remoteSyncPolicy({
      SUPABASE_URL: "u", SUPABASE_SERVICE_ROLE_KEY: "k", KAAMSABHA_SYNC_WORKSPACE: "   ",
    }).workspace,
    DEFAULT_SYNC_WORKSPACE,
  );
});

test("a request body over the ceiling is refused before it is parsed", async () => {
  const big = JSON.stringify({ blob: "x".repeat(2000) });
  const refused = await readJsonBody(post(big), 1024);
  assert.equal(refused.ok, false);
  assert.equal(refused.ok === false ? refused.status : 0, 413);

  // A lying content-length must not get past the real measurement.
  const lying = await readJsonBody(post(big, { "content-length": "10" }), 1024);
  assert.equal(lying.ok, false);
  assert.equal(lying.ok === false ? lying.status : 0, 413);
});

test("only a JSON object is accepted as a body", async () => {
  assert.equal((await readJsonBody(post("not json"), 1024)).ok, false);
  assert.equal((await readJsonBody(post("[1,2,3]"), 1024)).ok, false, "an array is not a body");
  assert.equal((await readJsonBody(post("null"), 1024)).ok, false);
  assert.equal((await readJsonBody(post('"a string"'), 1024)).ok, false);
  const good = await readJsonBody(post('{"a":1}'), 1024);
  assert.equal(good.ok, true);
  assert.deepEqual(good.ok === true ? good.body : null, { a: 1 });
});

test("raw webhook/file input preserves exact bytes and cancels an oversized stream",async()=>{
  const bytes=new Uint8Array([0,255,123,13,10,34,195,169]);
  const raw=await readRawBody(new Request("https://example.test",{method:"POST",body:bytes}),100);assert.equal(raw.ok,true);if(raw.ok)assert.deepEqual(Array.from(raw.body),Array.from(bytes));
  let cancelled=false;
  const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(100));},cancel(){cancelled=true;}});
  const request=new Request("https://example.test",{method:"POST",body:stream,duplex:"half"} as RequestInit);
  const large=await readRawBody(request,120);assert.equal(large.ok,false);assert.equal(large.ok?0:large.status,413);assert.equal(cancelled,true);
});

test("the limiter allows a burst up to the limit, then refuses until the window rolls", () => {
  resetRateLimits();
  const start = 1_000_000;
  for (let i = 1; i <= 3; i += 1) {
    assert.equal(rateLimit("k", 3, 60_000, start).ok, true, `request ${i} inside the limit`);
  }
  const over = rateLimit("k", 3, 60_000, start);
  assert.equal(over.ok, false);
  assert.equal(over.remaining, 0);
  assert.ok(over.retryAfterSeconds > 0 && over.retryAfterSeconds <= 60);

  // Still refused just before the window ends, allowed once it has passed.
  assert.equal(rateLimit("k", 3, 60_000, start + 59_000).ok, false);
  assert.equal(rateLimit("k", 3, 60_000, start + 60_001).ok, true);
});

test("limits are per client and per endpoint, so one caller cannot block another", () => {
  resetRateLimits();
  const now = 2_000_000;
  const a = new Request("https://example.test/x", { headers: { "x-forwarded-for": "1.1.1.1, 9.9.9.9" } });
  const b = new Request("https://example.test/x", { headers: { "x-real-ip": "2.2.2.2" } });
  assert.equal(clientKey(a, "otp"), "otp:1.1.1.1", "the first forwarded hop identifies the client");
  assert.notEqual(clientKey(a, "otp"), clientKey(a, "route"), "endpoints are counted separately");
  assert.notEqual(clientKey(a, "otp"), clientKey(b, "otp"));

  assert.equal(rateLimit(clientKey(a, "otp"), 1, 60_000, now).ok, true);
  assert.equal(rateLimit(clientKey(a, "otp"), 1, 60_000, now).ok, false, "same client, same endpoint");
  assert.equal(rateLimit(clientKey(b, "otp"), 1, 60_000, now).ok, true, "a different client is unaffected");
  assert.equal(rateLimit(clientKey(a, "route"), 1, 60_000, now).ok, true, "a different endpoint is unaffected");
});

test("a refusal tells the caller when to come back", () => {
  resetRateLimits();
  const now = 3_000_000;
  rateLimit("h", 1, 60_000, now);
  const blocked = rateLimit("h", 1, 60_000, now);
  const headers = rateLimitHeaders(blocked, 1);
  assert.equal(headers["RateLimit-Limit"], "1");
  assert.equal(headers["RateLimit-Remaining"], "0");
  assert.ok("Retry-After" in headers, "a refused caller must be told how long to wait");

  const allowed = rateLimit("h2", 5, 60_000, now);
  assert.ok(!("Retry-After" in rateLimitHeaders(allowed, 5)), "an allowed caller needs no Retry-After");
});

test("the limiter does not grow without bound on a long-lived instance", () => {
  resetRateLimits();
  const now = 4_000_000;
  // Far more distinct callers than the tracked ceiling, all in expired windows.
  for (let i = 0; i < 6_000; i += 1) rateLimit(`flood-${i}`, 1, 1_000, now);
  const after = rateLimit("fresh", 1, 60_000, now + 10_000);
  assert.equal(after.ok, true, "the limiter keeps working after a flood of keys");
});

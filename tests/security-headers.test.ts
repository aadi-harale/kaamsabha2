import test from "node:test";
import assert from "node:assert/strict";
import { securityHeaderRules } from "../lib/security-headers.ts";

// Resolve the ordered rules against a Host header, as Next does for these header-only conditions.
function headersFor(host: string, isDev = false, api = false) {
  const headers = new Map<string, string>();
  for (const rule of securityHeaderRules(isDev)) {
    if (rule.source.startsWith("/api") && !api) continue;
    if ("missing" in rule && rule.missing?.some(condition => new RegExp(`^${condition.value}$`).test(host))) continue;
    for (const header of rule.headers) headers.set(header.key, header.value);
  }
  return headers;
}

test("production HTTP phone demos keep local scripts on HTTP across private network ranges", () => {
  for (const host of ["localhost:3012", "127.0.0.1:3012", "127.2.3.4", "0.0.0.0:3012", "[::1]:3012",
    "10.20.10.84:3012", "10.0.0.1", "10.255.255.255", "172.16.0.1", "172.31.255.255:3012", "192.168.1.4:3012"]) {
    const headers = headersFor(host), csp = headers.get("Content-Security-Policy")!;
    assert.ok(!csp.includes("upgrade-insecure-requests"), host);
    assert.equal(headers.has("Strict-Transport-Security"), false, host);
    assert.match(csp, /default-src 'self'/); assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors 'none'/); assert.ok(!csp.includes("unsafe-eval"));
    assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(headers.get("X-Frame-Options"), "DENY");
  }
});

test("public production hosts retain HTTPS upgrade and HSTS, including address-lookalike names", () => {
  for (const host of ["kaamsabha2.vercel.app", "demo.example.com:3012", "8.8.8.8", "172.15.0.1", "172.32.0.1",
    "192.169.1.4", "10.20.10.84.example.com", "localhost.example.com", "110.20.10.84", "10.999.1.1"]) {
    const headers = headersFor(host);
    assert.match(headers.get("Content-Security-Policy")!, /upgrade-insecure-requests/, host);
    assert.match(headers.get("Strict-Transport-Security")!, /max-age=63072000/, host);
    assert.ok(!headers.get("Content-Security-Policy")!.includes("unsafe-eval"));
  }
});

test("development HTTP keeps refresh scripts usable while API responses remain uncacheable", () => {
  for (const host of ["localhost:3012", "10.20.10.84:3012", "local-demo.example.test"]) {
    const headers = headersFor(host, true, true), csp = headers.get("Content-Security-Policy")!;
    assert.ok(!csp.includes("upgrade-insecure-requests")); assert.ok(csp.includes("unsafe-eval"));
    assert.match(csp, /ws: wss:/); assert.equal(headers.has("Strict-Transport-Security"), false);
    assert.equal(headers.get("Cache-Control"), "no-store, max-age=0");
  }
});

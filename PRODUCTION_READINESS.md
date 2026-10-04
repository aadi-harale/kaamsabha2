# Production readiness

Read this before deploying KaamSabha anywhere real workers or real customers will use it.

## The short answer

**This application is not ready for production, and it cannot be made ready by changing
configuration.** The gap is architectural, not a list of bugs.

Every rule KaamSabha promises — who may take a job, what a worker must be paid, when work may
start, who may vote, what a receipt says — is enforced by JavaScript running in the user's own
browser, against a register stored in that browser's `localStorage`. Anyone can open developer
tools and rewrite all of it in about thirty seconds: give themselves jobs, raise their own
payout, mark a job started without a customer's code, activate a policy with no ballot, or
rewrite a settled decision receipt.

That is not a criticism of the prototype. It is the correct shape for a demo that has to run
reliably offline in front of judges, and the codebase says so in several places. But it means
the trust model the product describes does not exist yet.

**What has to be built before real use:** a server that owns the register and re-runs every
command, real user identity, and a database with row-level security. Until then, treat every
deployment as a demonstration.

## What is genuinely solid

These parts are real and would survive the move to a backend largely unchanged:

- **The domain and dispatch rules** (`lib/domain.ts`, `lib/commands.ts`). Pure, deterministic
  functions with no I/O. They are the natural core of a server implementation — the same
  functions, called after an authenticated request instead of before a `localStorage` write.
- **Allocation explainability** (`lib/allocation-explain.ts`). Reconstructs every decision from
  frozen receipt inputs rather than current state, so answers do not drift. Well covered.
- **The job flow model** (`lib/job-flow.ts`). One shared source of truth for which step a job is
  on and whose move it is.
- **OTP signing and verification** (`lib/otp.ts`). HMAC-SHA256, job-bound, purpose-bound, with
  expiry and constant-time comparison, done server-side. This is real cryptography, not a
  simulation.
- **Federation routing** (`lib/federation.ts`, `lib/federation-operations.ts`). Chooses a
  cooperative on capacity, protection compatibility and SLA, and never ranks workers across
  cooperatives.
- **Test coverage.** 81 tests over the rules, the explanations, the flow, the OTP lifecycle and
  the API guards. CI runs tests, typecheck and a production build on every push and PR.
- **Accessibility and responsive behaviour.** Semantic HTML, keyboard operation, visible focus,
  no colour-only meaning, verified at 320/768/1024/1440px with no horizontal page scroll.

## What is a demo stand-in, and clearly labelled as one

| Area | What it actually does | What production needs |
| --- | --- | --- |
| Authentication | `lib/demo-auth.ts`. Every account's password is `12345`, compared in the browser. No hashing, no server session. | Real identity (phone OTP suits this user base), hashed credentials, server-issued sessions, and authorization checked on the server for every request. |
| The register | `localStorage` on one device. `sessionStorage` separates roles in one browser. | A database as the single source of truth, with row-level security, so a client cannot read or write another party's rows. |
| Rule enforcement | `requireRole()` and every guard in `lib/commands.ts` run client-side. | The same functions on the server, as the only path that can change state. |
| Payments | `components/demo-payment-sheet.tsx`, labelled "no real transaction or Razorpay API call occurs". | A real PSP integration, server-verified webhooks, idempotency, refunds, reconciliation, and the tax and settlement obligations that follow. |
| OTP delivery | In demo mode the code is shown on screen because one browser runs both roles. With a real `KAAMSABHA_OTP_SECRET` and demo off, nothing is stored or shown — and nothing is delivered, because no SMS provider is wired up. | An SMS or push provider, plus server-side attempt limits and single-use enforcement (both currently live in the client's register). |
| Worker positions | Deterministic illustrative points derived from the job, never real GPS. The UI says worker home addresses are never shown. | Consented, privacy-reviewed live location with a retention policy. Worker tracking is a safety and dignity question, not just a feature. |
| Supabase mirror | Optional, off by default, and now refuses anonymous writes unless explicitly opted in. | See the next section. |
| AI assistance | `/api/ai/*` with OpenRouter and a deterministic offline fallback. Constitutionally advisory: it cannot dispatch, rank, price, penalise, vote or activate policy. | Unchanged in principle. Keep the boundary; add logging and cost controls. |

## Security work done in this pass

These were real defects, not theoretical ones:

- **`/api/state` accepted unauthenticated writes and persisted them with the Supabase
  service-role key**, which bypasses row-level security. Any deployment that followed
  `.env.example` and enabled the mirror was shipping a world-writable, world-readable database.
  It now fails closed: writes return `403` unless `KAAMSABHA_ALLOW_ANONYMOUS_STATE_WRITES=true`
  is set deliberately, and even then the payload must look like a register (schema 1), stay
  under 512 KB, and target the one workspace the deployment names.

  This is a mitigation, not a fix. A browser holds no secret, so a browser-authored write can
  never be authenticated. The honest position is in the refusal message the route returns.

- **The AI routes proxied to OpenRouter on the deployer's key with no throttle**, so anyone
  could drain the account. All API routes are now rate-limited (`lib/rate-limit.ts`), with
  body-size ceilings and `Retry-After` on refusal.

- **No security headers.** CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and HSTS are now set in
  `next.config.ts`, and `Cache-Control: no-store` on `/api/*`. Verified against the production
  build with no CSP violations and the maps still working.

- **One render error blanked the entire app**, which on a device-local register looks exactly
  like lost data. `components/error-boundary.tsx` now offers reload first, and a clearly
  confirmed destructive reset second.

**Known limits of these mitigations:**

- The rate limiter holds counters in one serverless instance's memory. Several instances
  multiply the effective limit, and a cold start forgets everything. Put a real limiter
  (the platform's WAF, or a shared store) in front of a real deployment.
- The CSP allows `'unsafe-inline'` for styles, which Leaflet requires for tile transforms, and
  for scripts, which Next.js's bootstrap requires. Adopting Next's nonce support would close
  the script side and is worth doing before this carries user data.
- `x-forwarded-for` is spoofable, so the limiter's client identity is a speed bump, not a
  control.

## What production would take, in order

1. **A server that owns the register.** Move `lib/commands.ts` behind authenticated endpoints.
   The browser proposes; the server decides, re-running the same pure functions. This is the
   step that makes every other guarantee real, and the domain layer is already shaped for it.
2. **Real identity.** Phone-number OTP fits the user base. Hashed credentials, server sessions,
   per-role authorization enforced server-side.
3. **A database with row-level security**, so a worker cannot read another cooperative's jobs
   even with a valid token. The existing `supabase/001_kaamsabha_state.sql` stores the whole
   register as one blob per workspace; production needs normalized tables with policies.
4. **Move OTP state server-side.** Attempt limits and single-use are currently enforced in the
   client's register, which a determined client can edit. Add SMS delivery.
5. **Payments.** A PSP, server-verified webhooks, idempotency keys, reconciliation, refunds.
6. **Durable decision receipts.** Receipts are the product's evidentiary core. They should be
   append-only and tamper-evident (hash-chained) rather than editable JSON.
7. **Operational basics.** Error reporting, structured logs, uptime checks, backups with a
   tested restore, and a migration path for the register schema.
8. **Legal and safety review before real workers rely on it.** Worker data retention, location
   consent, payment and tax obligations, grievance process, and what happens when the Rating
   Firewall's human review disagrees with a customer.

## Deploying the demo safely today

This is a reasonable thing to do, and it is what the app is currently fit for.

- Leave `NEXT_PUBLIC_KAAMSABHA_REMOTE_SYNC=false` and do not set Supabase credentials. The
  register stays on each visitor's device and there is nothing shared to attack.
- Set a long random `KAAMSABHA_OTP_SECRET`. Keep `KAAMSABHA_DEMO_MODE=true` so the single-browser
  walkthrough works; the on-screen code is clearly labelled as standing in for an SMS.
- Set `OPENROUTER_API_KEY` only if you want the AI intake, and watch the spend. The deterministic
  fallback means the app works fully without it.
- Never set `KAAMSABHA_ALLOW_ANONYMOUS_STATE_WRITES=true` on anything you care about.
- Say on the page, or in the pitch, that it is a prototype. The login screen already does.

## Verification

`npm run verify` runs tests, typecheck and a production build. CI runs the same on every push
and pull request. Beyond that, this pass was checked in a real browser against the production
build: full customer/worker/admin lifecycle, federation routing, safe decline, scope change,
settlement and feedback, at 320/768/1024/1440px, with no CSP violations, no JS errors and no
horizontal page scroll.

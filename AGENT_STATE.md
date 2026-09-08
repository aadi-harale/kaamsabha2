# Product

KAAMSABHA2 is the active SIH26089 implementation workspace. `aadi-harale/KaamSabha` is reference-only and was not modified.

# Iterations completed

Exactly three substantial iterations were used.

## Iteration 1 — foundation
Native Next.js/Vercel foundation, isolated role sessions, one versioned persisted state envelope, deterministic eligibility/dispatch primitives, protected payout floor, frozen Decision Receipts, guarded lifecycle transitions, CI verification workflow, safe environment template and deployment notes.

## Iteration 2 — judge-facing UX
Customer became service-first; worker task-first; admin operations-first. English/Hindi/Marathi navigation, responsive layouts, Fair Work, demand, federation and the SAME JOBS / SAME WORKERS / DIFFERENT RULES visual were made reachable without overwhelming the customer marketplace.

## Iteration 3 — integration and hardening
The cross-role work lifecycle is linked in the shared register: booking -> federation/cooperative dispatch -> worker acceptance/travel/arrival -> server-signed start OTP -> work proof -> scope change approval -> server-signed completion OTP -> settlement/invoice -> feedback/issues. Worker challenges create frozen Replay Court summaries. Admin settlement, worker certification, Policy Twin, demand and Federation Mesh views consume the same persisted state.

Federation dispatch enforces the intended two-stage rule: the federation selects an eligible cooperative first; only then does the receiving cooperative select its worker using its own constitution. The global worker protection floor is applied before receipt creation and again at settlement so inter-cooperative routing cannot undercut it.

# Verified invariants
- Deterministic seed 26089.
- Worker Protection Floor / protected payout / no reverse bidding.
- Hard skill, verification, activity, availability and workload safety before allocation.
- Federation selects cooperative first; receiving cooperative selects worker second.
- Decision receipts freeze cooperative, worker, policy version, hard checks and payout facts.
- Start/completion OTPs are job-specific, purpose-specific, expiring and server-signed; application state enforces attempt count and single-use lifecycle gates.
- Completion OTP cannot be issued before work proof and unresolved scope changes block completion approval.
- Refusal is not modeled as a rating/opportunity penalty; rating issues are review records rather than automatic deactivation.
- Settlement is job-linked and preserves the protection floor.
- Policy Twin is counterfactual-only and does not mutate active rules or settled receipts.
- AI remains intake-only.

# Verification evidence
Local Node 22 domain/integration suite passed 6/6 tests before commit, including cooperative-first federation dispatch, payout-floor protection, complete cross-role lifecycle gates, proof requirement and server OTP job/purpose/expiry checks.

A Vercel production URL was not linked at the time of this iteration, so no deployed smoke test is claimed. `VERCEL_DEPLOY.md` contains exact import, environment and smoke-test steps. The GitHub CI/build result for the final commit must be inspected before calling the repository production-ready.

# Data mode
The current repository is a deterministic SIH demo data adapter persisted in browser storage with isolated session storage. Supabase variable placeholders remain documented but no unverified Supabase persistence claim is made. Legacy persisted v1 state is normalized to the final schema on load.

# Freeze
No new product features after Iteration 3. Remaining work after Vercel linking is deployment verification only, not another substantial implementation iteration.

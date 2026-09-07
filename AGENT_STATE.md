# Product

KAAMSABHA2 is the active SIH26089 implementation workspace. `aadi-harale/KaamSabha` is reference-only and must never be modified from this workspace.

# Iteration 1 state

Iteration 1 established a native Next.js/Vercel foundation in the previously empty repository. The target no longer depends on Vinext, Vite, Wrangler, Cloudflare Workers, or Cloudflare-specific runtime assumptions.

The app now has one versioned application-state envelope, explicit customer/worker/admin sessions stored in sessionStorage, persisted demo domain state in localStorage, corrupt-state reset handling, deterministic worker selection, protected payout floor, frozen decision receipts, guarded job lifecycle transitions, shared jobs/issues/votes, and role-bound sign-in behavior. The UI is intentionally minimal in this iteration; Iteration 2 owns the full product UX rebuild.

# Preserved invariants

- Deterministic seed 26089.
- Worker Protection Floor / no reverse bidding.
- Hard worker eligibility precedes livelihood ordering.
- Decision receipts carry policy version and immutable allocation facts.
- Refusal/deactivation protections are treated as domain invariants for later role flows.
- Federation must choose a cooperative first; its own constitution then chooses a worker, with no worker-protection undercutting.
- Policy activation is separate from dispatch and cannot rewrite settled work.
- Customer, worker, admin sessions are isolated; role switching requires logout.
- AI remains intake-only and cannot dispatch, price, penalize, replay, or activate policy.

# Deployment boundary

`package.json` uses native `next dev`, `next build`, and `next start`. `vercel.json` selects the Next.js framework. `/api/health` explicitly uses the Node.js runtime. `.env.example` separates public Supabase identifiers from service-role/OpenRouter/OTP server secrets. `VERCEL_DEPLOY.md` contains one-time setup and smoke-test steps.

# Known gaps intentionally left for Iteration 2/3

- Full customer booking/route/OTP/evidence/change-order/settlement UI is not yet restored.
- Full worker Fair Work, challenge, voting, earnings and workload UX is not yet restored.
- Full operations/governance/federation screens are not yet restored.
- Connected Supabase repository/auth/storage/realtime implementation is not yet verified in this target.
- OTP server route and evidence storage are not yet implemented in this target; no insecure browser-only OTP path should be added.
- Hindi/Marathi UI coverage is pending.

# Verification

A GitHub Actions `Verify` workflow was added to run install, tests, typecheck, and production build on Node 22.19.0. This state file does not claim those checks passed until the workflow result is inspected.

# Next iteration

Iteration 2: rebuild the complete customer/worker/admin UX on top of this single state boundary, restore all SIH baseline features and KaamSabha differentiators that can be demonstrated coherently, then inspect responsive screenshots before committing.

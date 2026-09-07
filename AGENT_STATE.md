# Product

KAAMSABHA2 is the active SIH26089 implementation workspace. `aadi-harale/KaamSabha` is reference-only and must never be modified from this workspace.

# Iteration 1 state

Iteration 1 established a native Next.js/Vercel foundation with one versioned application-state envelope, isolated customer/worker/admin sessions, deterministic worker selection, protected payout floor, frozen Decision Receipts, guarded lifecycle transitions, shared jobs/issues/votes and explicit Vercel boundaries. Cloudflare/Vinext/Vite runtime assumptions are absent from the target.

# Iteration 2 state

Iteration 2 rebuilt the judge-facing UX around the design authority without changing the domain boundary. The customer view is now service-first with clear service discovery, smart-intake positioning, location, active/past orders and issue reporting. The worker view is task-first with current job, protected payout, route summary, workload safety, Fair Work reasoning, Decision Receipt visibility, earnings and member-governance surfaces. The admin view is operations-first with separate workers, live jobs, issues, settlements, governance/Policy Twin, demand forecast and Federation Mesh surfaces.

English/Hindi/Marathi navigation copy is available through the persisted locale setting. Responsive CSS explicitly covers desktop/tablet/mobile breakpoints down through 360px, preserves keyboard focus and reduced-motion handling, and keeps the required SAME JOBS / SAME WORKERS / DIFFERENT RULES visual prominent without turning the customer experience into a governance dashboard.

No browser-only OTP workaround was introduced. Start/completion OTP verification, evidence persistence and connected Supabase flows remain Iteration 3 integration work; the Iteration 2 UI does not falsely claim those server features are complete.

# Preserved invariants

- Deterministic seed 26089.
- Worker Protection Floor / no reverse bidding.
- Hard worker eligibility precedes livelihood ordering.
- Decision receipts carry policy version and immutable allocation facts.
- Refusal/deactivation protections remain domain invariants.
- Federation chooses a cooperative first; its own constitution then chooses a worker, with no worker-protection undercutting.
- Policy activation is separate from dispatch and cannot rewrite settled work.
- Customer, worker, admin sessions are isolated; role switching requires logout.
- AI remains intake-only and cannot dispatch, price, penalize, replay or activate policy.

# Deployment boundary

`package.json` uses native `next dev`, `next build`, and `next start`. `vercel.json` selects Next.js. `/api/health` uses the Node.js runtime. `.env.example` separates public identifiers from server-only secrets. `VERCEL_DEPLOY.md` contains one-time setup and smoke-test steps.

# Remaining Iteration 3 work

- Implement and verify server-side job-specific start/completion OTP flows; no insecure browser-only OTP.
- Implement/verify evidence and change-order persistence and customer approval linkage.
- Verify completion -> settlement -> Past Orders -> feedback/issues as one shared cross-role flow.
- Verify Supabase adapter/auth/storage/realtime path if configured; otherwise retain clearly-labelled deterministic demo mode.
- Verify challenge/vote/Replay/Policy Twin/Federation behavior end-to-end and Collective Pattern Court only if stable.
- Run tests, typecheck, lint/build where available and verify production Vercel deployment/smoke tests if project access is available.

# Verification note

Iteration 2 is committed only after the UI/state changes are assembled. A passing production build and screenshot smoke test must still be evidenced by CI/deployment checks; do not call the application production-ready until those checks and Iteration 3 flows pass.

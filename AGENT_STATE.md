# Product

KAAMSABHA2 is the active SIH26089 implementation workspace. `aadi-harale/KaamSabha` remains reference-only and was not modified.

# Build history

The original three substantial iterations established foundation, judge-facing UX, and full cross-role integration. After deployment, the user explicitly requested a final product-polish/closure pass; that pass did not introduce unrelated scope and only closed visible SIH/product gaps.

## Final verified product state

Customer flow is service-first and complete: discover/search service -> configure location/schedule/emergency -> persist structured problem intake and optional reference filename -> cooperative-first dispatch -> track assignment/travel -> issue start OTP -> review proof and Scope Lock change -> issue completion OTP -> settle invoice -> feedback/issues. Before arrival, cancellation produces an auditable cancellation-protection record; once a worker has accepted/travelled, the constitution protects 25% of the ₹760 floor (₹190 in the deterministic demo) and records the remaining customer refund.

Worker flow is task-first: current job, protected payout, real directions handoff to the service locality, demo ETA clearly labelled as demo, accept/travel/arrival, OTP verification, proof, change order, earnings, Workload Safety Guard, Opportunity Access Normalization, Decision Receipt, Replay Court challenge and one-member/one-vote governance.

Admin flow is operations-first: live register, verified workers/certifications/welfare guard, cases and rating firewall, settlements and cancellation protection, Cooperative Dispatch Constitution, Counterfactual Policy Twin, demand/workforce guidance, Federation Mesh and a reachable safeguard register.

# Differentiators verified/reachable

- Worker Protection Floor / Protected Payout / No Reverse Bidding.
- Cooperative Dispatch Constitution.
- Counterfactual Policy Twin (simulation only; cannot activate itself).
- Decision Receipt + Replay Court.
- Opportunity Access Normalization (refusal carries zero rating/opportunity penalty).
- Scope Lock + Change Order.
- Cancellation / Settlement Protection.
- Rating & Deactivation Firewall.
- Workload Safety Guard.
- Federation Mesh: eligible cooperative first, receiving cooperative's own constitution selects worker second.
- One member / one vote governance.
- SAME JOBS / SAME WORKERS / DIFFERENT RULES visual.

Collective Pattern Court is intentionally not enabled because it was not already implemented/stable; no fake surface was added.

# Baseline SIH26089 coverage

Worker registration/verification representation and certification registry, skill profiling, customer booking/scheduling, locality-based matching, payments/invoices, ratings/feedback, worker welfare, emergency/on-demand booking, cooperative/federation operations, English/Hindi/Marathi navigation, and synthetic demand/workforce guidance are all reachable. The deterministic demo stores structured intake; AI remains intake-only and no live external-model claim is made without a configured provider. In-app distance/ETA values are explicitly demo-labelled; the live-directions action hands off to Google Maps using the actual service locality rather than pretending a fake map is live.

# Verification evidence

GitHub Actions Verify run for commit `96139a00b0eeaffc54e4132c0dbcf83761883aee` passed install, tests, typecheck and production `next build`. The expanded domain suite includes structured intake persistence and accepted-job cancellation protection in addition to federation dispatch, payout floor, OTP gates, proof/change-order lifecycle and settlement.

Vercel project `kaamsabha2` is linked to `aadi-harale/kaamsabha2`. Production deployment for commit `96139a00b0eeaffc54e4132c0dbcf83761883aee` reached READY. `/api/health` is the production smoke endpoint. `FINAL_DEMO_CHECKLIST.md` contains the exact judge flow.

# Data mode

The current repository remains a deterministic SIH demo adapter persisted in browser localStorage with isolated role sessionStorage. Legacy v1 state is normalized forward, including new intake and cancellation arrays. Supabase placeholders remain documented, but no unverified Supabase persistence claim is made.

# Freeze

Feature development is frozen. Future changes should be bug fixes, provider wiring (for example real mapping/AI/Supabase), copy/localization expansion, or deployment maintenance only.

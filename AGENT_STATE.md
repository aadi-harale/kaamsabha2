# Product

KAAMSABHA2 is the active SIH26089 implementation workspace. `aadi-harale/KaamSabha` remains reference-only and was not modified. The final parity pass used that repository as behavioral/design reference and ported its important worker-governance, mapping and Federation Opportunity Exchange mechanisms into the native Next.js/Vercel implementation.

# Final product state

Customer flow is service-first: discover/search five service categories -> configure location/schedule/emergency -> structured problem intake and optional reference filename -> home-cooperative-first dispatch -> protected federation fallback only when local safe capacity fails -> in-browser OpenStreetMap/OSRM tracking -> start OTP -> work proof -> Scope Lock/change approval -> completion OTP -> settlement/invoice -> 1–5 feedback/support. Low ratings create a cooperative review case through the Rating Firewall and do not alter worker activation or opportunity access. Accepted/travelling cancellations create an auditable worker-protection payment.

Worker flow is task-first: protected payout and scope before commitment, real in-browser route, safe decline with zero penalty, configurable workability limits, OTP verification, evidence, change orders, earnings, Fair Work Decision Receipt, persisted Opportunity Access ledger, Replay Court challenge, Issues, Speak-up policy suggestions, personal Policy Twin impact review, dissent-aware one-member/one-vote governance and visible proposal status.

Admin flow is operations-first: live jobs, verified members/certifications/workability, shared issues and Rating Firewall cases, Replay Court execution, worker suggestion review, money/cancellation ledger, executable Cooperative Dispatch Constitution governance, protection validator, Counterfactual Policy Twin, quorum/approval-controlled activation, synthetic demand planning, full Federation Opportunity Exchange and safeguard register.

# Federation Opportunity Exchange

Federation is an executable second decision layer rather than a platform-wide worker pool.

1. The booking resolves the customer's home cooperative from locality.
2. That cooperative checks its own certified, active, available and workload-safe workers first.
3. Only if no local member can safely serve the request does the federation compare other cooperatives using capacity, Worker Protection Covenant compatibility and customer SLA.
4. The federation selects a cooperative, never an individual worker.
5. The receiving cooperative then selects its own worker under its active constitution.

The persisted federation proof contains candidate cooperative exclusions, linked cooperative/worker receipt IDs, a frozen capacity snapshot, replay result and a reconciled illustrative settlement. The deterministic judge vector matches the reference story: Kharadi has no safe local electrician capacity; Yerawada has two safely available members at 24 minutes and is selected; Viman Nagar is blocked by workload protection despite a 21-minute ETA; Hadapsar is outside the 35-minute promise at 39 minutes; Yerawada's own constitution selects Meena Jadhav.

The Federation Policy Twin runs the same 12 capacity scenarios in Local-only and Federation Mesh modes. The deterministic vector produces Local-only 0 served / 12 unfilled versus Federation Mesh 11 served / 1 unfilled, 22.5-minute average ETA, 25-minute p90, 11 cross-cooperative fulfilments and zero worker-protection violations.

Federation cannot undercut the active Worker Protection Floor. A post-ballot regression test activates an ₹860 floor and verifies a later federation proof pays ₹860; its illustrative customer total becomes ₹1,000 = ₹860 worker + ₹40 welfare + ₹100 fulfilling cooperative.

# Governance and worker voice

Worker-facing speaking-up paths are intentionally separate and plain-language:

- **Issue** — something is wrong with a current service, safety, payment, scope or interaction.
- **Replay Court challenge** — a past allocation decision appears wrong; admin replays its frozen receipt rather than today's state.
- **Speak up / Suggestion** — the worker thinks a future rule should change. The suggestion has category, title, details and review status and never mutates policy by itself.
- **Member ballot** — a validated/simulated proposal is ready for governance. A worker must review personal impact before voting; a no vote requires a dissent reason so opposition remains attached to the record.

The executable policy lifecycle is Suggest -> protection validation -> Policy Twin -> personal impact review -> one-member/one-vote -> quorum -> approval -> activation. The judge proposal requires 9 participating members and 7 support votes. The Worker Protection Floor, paid-priority ban, reverse-auction ban and bounded fair-wait rule are validated before activation. Once activated, a new constitution affects only later dispatches; existing Decision Receipts and settlements stay frozen.

# Differentiators implemented and reachable

- Worker Protection Floor / Protected Payout / No Reverse Bidding.
- Cooperative Dispatch Constitution.
- Counterfactual Policy Twin.
- Decision Receipt + Replay Court with frozen-input replay.
- Opportunity Access Normalization backed by persisted eligible-offer records.
- Scope Lock + Change Order.
- Cancellation / Settlement Protection.
- Rating & Deactivation Firewall backed by human-review issue records.
- Workload Safety Guard and member-set workability limits.
- Federation Opportunity Exchange / Federation Mesh with two-stage selection, two receipts, replay and Policy Twin.
- Worker Suggestions / Member Voice.
- Personal policy impact + One Member / One Vote + quorum-controlled activation.
- SAME JOBS / SAME WORKERS / DIFFERENT RULES visual.

Collective Pattern Court remains intentionally disabled because no stable implementation exists; there is no fake surface for it.

# Baseline SIH26089 coverage

Worker verification/certification registry, skill profiles, customer booking/scheduling, locality-based matching, five service categories, payments/invoices, ratings/feedback, worker welfare/workability, emergency/on-demand booking, cooperative/federation operations, English/Hindi/Marathi navigation, and synthetic demand/workforce guidance are reachable.

# Maps and providers

Customer and worker tracking use Leaflet with OpenStreetMap tiles inside the browser. `/api/route` uses public OSRM road geometry/distance/duration and falls back to a clearly labelled approximate direct route if routing fails. Map tile failure has an accessible service-area fallback. Worker positions are deterministic illustrative service positions; worker home addresses and production live GPS are not claimed.

AI intake is server-side and intake-only. With an OpenRouter key it can structure a customer's problem description; missing/failed provider access leaves manual booking available. AI never dispatches, prices, penalizes, replays or activates policy.

Browser localStorage remains the reliable deterministic demo source of truth with isolated role sessionStorage. Optional Supabase remote mirroring is provider wiring, not a claim that hosted Supabase is the verified authoritative repository. No hosted RLS/Realtime/private-storage claim is made without credentials and migration verification.

# Verification evidence

GitHub Actions Verify run `34184375446` for commit `71646e0062cd81f05f90d07c7463a97e8285d25f` passed install, 20 tests, TypeScript typecheck and production Next.js build. The suite covers home-cooperative-first dispatch, automatic federation fallback, golden federation exclusions, protection undercut blocking, frozen federation replay, Local-only vs Mesh Policy Twin, OTP/proof/Scope Lock/settlement lifecycle, cancellation protection, Opportunity Access safe decline, workability, worker suggestions, personal-impact-before-vote, quorum activation, paid-priority/reverse-auction/floor-cut rejection, Rating Firewall, and post-activation federation settlement protection.

`FINAL_DEMO_CHECKLIST.md` is the authoritative judge walkthrough. After documentation-only commits, re-run CI and verify the exact final production deployment before claiming the public Vercel alias is current.

# Freeze

Product feature work is frozen after this parity pass. Remaining work is deployment/browser verification, bug fixing, provider credential wiring, or deeper Hindi/Marathi copy coverage—not another feature expansion.

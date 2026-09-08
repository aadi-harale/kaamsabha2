# Product

KAAMSABHA2 is the active SIH26089 implementation workspace. `aadi-harale/KaamSabha` remains reference-only and was not modified. The final parity audit used that repository as behavioral/design reference and ported its important application-level worker-governance, mapping, Federation Opportunity Exchange and AI-assisted intake/policy-review mechanisms into the native Next.js/Vercel implementation.

# Final product state

Customer flow is service-first: discover/search five service categories -> configure location/schedule/emergency -> structured problem intake and optional reference filename -> home-cooperative-first dispatch -> protected federation fallback only when local safe capacity fails -> in-browser OpenStreetMap/OSRM tracking -> start OTP -> work proof -> Scope Lock/change approval -> completion OTP -> settlement/invoice -> 1–5 feedback/support. Low ratings create a cooperative review case through the Rating Firewall and do not alter worker activation or opportunity access. Accepted/travelling cancellations create an auditable worker-protection payment.

Worker flow is task-first: protected payout and scope before commitment, in-browser route, safe decline with zero penalty, configurable workability limits, OTP verification, evidence, change orders, earnings, Fair Work Decision Receipt, persisted Opportunity Access ledger, Replay Court challenge, Issues, Speak-up policy suggestions, personal Policy Twin impact review, dissent-aware one-member/one-vote governance and visible proposal status.

Admin flow is operations-first: live jobs, verified members/certifications/workability, shared issues and Rating Firewall cases, Replay Court execution, worker suggestion review, money/cancellation ledger, executable Cooperative Dispatch Constitution governance, Worker Protection Validator, Counterfactual Policy Twin, quorum/approval-controlled activation, Collective Pattern Court / Policy Signal Monitor, synthetic demand planning, and an operational Federation Opportunity Exchange.

# Federation Opportunity Exchange

Federation is now an application workflow, not an information page.

1. Admin opens **Requests** and chooses the home cooperative, service shortage and customer SLA.
2. KaamSabha refuses to open federation routing if the home cooperative still has safe local capacity.
3. A real overflow job/request is persisted with a frozen capacity candidate set.
4. Admin reviews **Control map**, **Requests**, **Capacity** and **History & receipts** tabs.
5. The admin may choose only an eligible receiving cooperative. Ineligible candidates expose the exact capacity/workload/SLA/protection reason.
6. Clicking **Initiate job transfer** routes the job opportunity to that cooperative.
7. The receiving cooperative then selects its own worker under its own active constitution. The admin never globally chooses the cheapest worker.
8. A worker opportunity record and linked worker Decision Receipt are created. The transferred job can continue through the normal customer/worker lifecycle.

The capacity matrix exposes five service categories across the four cooperatives and highlights safe capacity, constrained capacity, workload blocks and waiting demand. The compact federation map is deliberately a preview; clicking it opens a large glassmorphism modal with a fully interactive Leaflet/OpenStreetMap map. Candidate markers in the expanded map can be used to choose an eligible receiving cooperative. CSS paint containment/isolation keeps Leaflet tiles, panes and controls from leaking over neighboring UI.

The seeded federation history still preserves the deterministic judge proof from the reference story: Kharadi has no safe local electrician capacity; Yerawada has two safely available members at 24 minutes; Viman Nagar is blocked by workload protection despite a 21-minute ETA; Hadapsar misses the 35-minute customer promise at 39 minutes; federation selects Yerawada first, then Yerawada's own constitution selects Meena Jadhav.

The persisted federation proof contains candidate cooperative exclusions, linked cooperative/worker receipt IDs, frozen capacity snapshots, replay results and an illustrative reconciled settlement. The Federation Policy Twin runs identical Local-only and Federation Mesh scenarios and preserves zero worker-protection violations. Federation cannot undercut the active Worker Protection Floor; post-ballot tests verify later federation transfers respect a raised floor.

# Governance, worker voice and Collective Pattern Court

Worker-facing speaking-up paths stay separate and plain-language:

- **Issue** — something is wrong with a current service, safety, payment, scope or interaction.
- **Replay Court challenge** — a past allocation decision appears wrong; admin replays its frozen receipt rather than today's state.
- **Speak up / Suggestion** — the worker thinks a future rule should change. Category, title, details and review status persist; a suggestion cannot mutate policy itself.
- **Member ballot** — a validated/simulated proposal is ready for governance. Personal impact review is mandatory before one-member/one-vote; dissent stays attached.

The **Collective Pattern Court / Policy Signal Monitor** is now implemented in Admin -> Governance. It reads only worker-origin issues plus worker policy suggestions, clusters repeated concerns, records auditable analysis snapshots, and drafts discussion language. With `OPENROUTER_API_KEY` + `OPENROUTER_MODEL`, `/api/ai/policy` uses OpenRouter; otherwise it uses a deterministic category/keyword fallback so the workflow still functions offline/provider-down. The AI is constitutionally advisory: it cannot rank workers, infer guilt, penalize/deactivate, dispatch, set pay, vote, decide Replay Court outcomes or activate a policy. Any AI draft still stops before protection validation -> Policy Twin -> personal impact -> member ballot.

The executable policy lifecycle remains Suggest -> protection validation -> Policy Twin -> personal impact review -> one-member/one-vote -> quorum -> approval -> activation. The judge proposal requires 9 participating members and 7 support votes. Paid priority, reverse auctions and payout-floor cuts are blocked before activation. New constitutions affect only later dispatches; existing receipts remain frozen.

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
- Federation Opportunity Exchange / Federation Mesh with admin transfer workflow, capacity matrix, two-stage selection, two receipts, replay and Policy Twin.
- Worker Suggestions / Member Voice.
- Collective Pattern Court / AI Policy Signal Monitor with deterministic fallback and audit records.
- Personal policy impact + One Member / One Vote + quorum-controlled activation.
- SAME JOBS / SAME WORKERS / DIFFERENT RULES visual.

# Reference-repo parity audit

Important application behavior from `aadi-harale/KaamSabha` is represented in KAAMSABHA2: five-service booking, worker verification/skills, customer/worker maps, OSRM fallback, OTP lifecycle, proof/change orders, cancellation protection, Rating Firewall, workload/workability controls, Opportunity Access records, worker issues, rule suggestions, personal policy impact, voting, Replay Court, Federation Opportunity Exchange, two receipts, federation replay/Policy Twin, AI customer intake and guarded AI policy-signal analysis.

Reference-repo infrastructure that is intentionally **not claimed as parity** in this browser-first demo includes production password/Auth binding, normalized Supabase RLS/Realtime/private Storage migrations as an authoritative hosted runtime, SHA-256 chained decision snapshots, production messaging/live GPS, regulated payments/escrow and production demand forecasting. These are deployment/infrastructure claims, not hidden mock features. The current implementation keeps the tested local-first hackathon flow reliable and labels provider boundaries honestly.

# Maps and providers

Customer and worker tracking use Leaflet with OpenStreetMap tiles inside the browser. `/api/route` uses public OSRM road geometry/distance/duration and falls back to a clearly labelled approximate direct route if routing fails. Map tile failure has an accessible service-area fallback. All compact maps can be expanded into a glassmorphism modal; the expanded map is interactive and the preview is intentionally click-to-expand to avoid cramped Leaflet controls/overlays. Worker positions are deterministic illustrative service positions; worker home addresses and production live GPS are not claimed.

OpenRouter is optional and server-only. `/api/ai/intake` structures customer intake; `/api/ai/policy` clusters worker-origin issues/suggestions for human governance review. Both have safe fallback behavior and neither may make consequential worker/governance decisions.

Browser localStorage remains the reliable deterministic demo source of truth with isolated role sessionStorage. Optional Supabase remote mirroring is provider wiring, not a claim that hosted Supabase is the verified authoritative repository.

# Verification evidence

GitHub Actions after the operational federation/AI pass runs the expanded test suite, TypeScript typecheck and production Next.js build. New tests verify that admin federation requests only open for genuine overflow, admins can choose an eligible receiving cooperative, ineligible transfer targets are blocked, the receiving cooperative selects its own worker, protection floors are preserved, and Collective Pattern Court analysis records cannot mutate policy or workers.

`FINAL_DEMO_CHECKLIST.md` is the authoritative judge walkthrough. Verify the exact final production Vercel deployment before claiming the public alias is current.

# Freeze

Product feature work is frozen after this operational parity pass. Remaining work is deployment/browser verification, bug fixing, provider credential wiring or deeper Hindi/Marathi copy coverage—not another feature expansion.

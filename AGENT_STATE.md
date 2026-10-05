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

# Allocation explainability and flow legibility pass

A member can now ask "why did I not get that job?" and get an answer in plain words.

`lib/allocation-explain.ts` reconstructs one outcome per member per frozen receipt: selected,
safely declined, passed over on turn order, blocked by a named protection, not certified, in a
cooperative the job never reached, or a receipt that predates candidate recording. Every answer
is rebuilt from the receipt's frozen candidate snapshot, so it does not drift as today's
register changes, and every answer states the rating and opportunity consequence. Turn-order
comparisons are stated with the actual minute figures and the actual margin; an exact tie is
described as the fixed member-ID tie-break rather than a judgement. The module keeps two
voices for the same check — one addressed to the member it is about, one for the operations
register, which is about other people — and tests pin that the operations wording never says
"you".

`DecisionReceipt` now also freezes `homeCooperativeId` and `homeCandidateSnapshot`. Without it,
a member whose own cooperative lost a job to federation appeared in no candidate set and could
be told nothing at all. With it, they are told their cooperative had no safe local capacity and
that federation compared cooperatives, never individual workers across cooperatives.

Surfaces: worker Fair Work (full record, filterable to "Didn't get"), the worker idle screen
(*Why you have no job right now*, the five dispatch checks with a pass/needs-attention word so
meaning is never carried by colour alone, and the last jobs that went elsewhere), the customer
booking card (a short *why this member* summary with no internal ranking, and a reason when
nobody is assigned yet), and admin Overview (*Allocation record*: the whole considered set with
a reason per member).

`lib/job-flow.ts` is one nine-step model shared by all three roles. It decides whose move it is
and what that person should do, in their own vocabulary, and tests assert a job is never
waiting on both sides at once. It closed the dead ends at `arrived`, `started`, `completed` and
after settlement, where neither side was told who was holding the job up.

Seed members W11 Sunita Rathod (Kharadi electrician at her own daily limit), W12 Farhan Qureshi
and W13 Leela Waghmare (both Kharadi plumbers, different workloads) exist so both shapes of
"why not me" appear in a default demo run. They preserve the existing fixtures: Kharadi still
has exactly one eligible electrician, so W02 still wins and a safe decline still federates out.

# Fixes in the same pass

- **OTP was unusable across a role switch.** The demo code lived only in React state, so a
  reload or a sign-out destroyed it and the worker could never be given the code the job needed
  to proceed. It is now held on the challenge in the shared register, with a countdown and the
  attempts remaining on both sides. A code is still only returned when the deployment is in
  demo mode; with a real `KAAMSABHA_OTP_SECRET` and demo off, nothing is stored or shown and
  the panel says plainly that no delivery channel is wired rather than claiming an SMS was sent.
- **An expired code used to consume an attempt.** Expiry is the clock running out, not a failed
  guess, and must cost the member nothing.
- **Leaflet was torn down and rebuilt whenever the route arrived, and never re-measured.** The
  map is now created once per host, redraws its pins and route line in place, and watches its
  container with a `ResizeObserver`, so a layout change around it (a job moving from `arrived`
  to `started` swaps a whole panel in and out) no longer leaves tiles painted for a stale size.
- **`DemoShell` re-rendered the whole workspace several times a second.** Its poll handed React
  a freshly parsed session object every tick, tearing down and rebuilding the MutationObserver
  and the click listener with it. It now compares by value and fires only on a real session
  change, and the text rewriter skips Leaflet subtrees, which mutate constantly.
- **320px had horizontal page scroll**, which the quality floor forbids. Root causes were
  `<select>` elements sizing to their widest option, grid children refusing to go below their
  min-content floor, and the three-up rule strip never collapsing. The turn-order table scrolls
  inside its own container rather than moving the page.
- **`next dev` appended its own block to `AGENTS.md` on every run.** `agentRules: false` in
  `next.config.ts` stops the project's own build standards from being a permanently dirty file.

# Deployment hardening pass

`PRODUCTION_READINESS.md` is the authoritative answer to "is this ready for production". The
short version, stated there plainly: it is not, and configuration cannot make it so. Every rule
the product guarantees is enforced in the browser against a `localStorage` register, so anyone
with developer tools can rewrite it. Making it real needs a server that owns the register and
re-runs `lib/commands.ts` behind real identity. The domain layer is already shaped for that
move; nothing else can substitute for it.

Real defects closed in this pass:

- **`/api/state` accepted anonymous writes and persisted them with the Supabase service-role
  key**, which bypasses row-level security. Any deployment that enabled the mirror was shipping
  a world-writable, world-readable database. It now fails closed (`403`) unless
  `KAAMSABHA_ALLOW_ANONYMOUS_STATE_WRITES=true` is set deliberately, and even then the payload
  must be a schema-1 register under 512 KB targeting the single workspace the deployment names
  (`lib/remote-sync-policy.ts`). This is a mitigation, not a fix: a browser holds no secret, so
  a browser-authored write can never be authenticated, and the refusal message says so.
- **The AI routes proxied to OpenRouter on the deployer's key with no throttle.** All API routes
  are now rate-limited with body-size ceilings and `Retry-After` (`lib/rate-limit.ts`). The
  limiter is per-instance memory and is documented as a speed bump, not a control.
- **No security headers.** CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS, and `Cache-Control: no-store` on
  `/api/*`. Verified against the production build: no CSP violations, maps and OSRM routing
  still work. `'unsafe-inline'` remains for styles (Leaflet tile transforms) and scripts (Next
  bootstrap); nonce adoption is the next step and is recorded in the readiness doc.
- **A critical RCE advisory in Next.js 16.2.0-16.3.5** (GHSA-vcvr-r3jv-pc5j, `next/og`
  ImageResponse). Upgraded to 16.3.8; `npm audit --omit=dev` reports zero vulnerabilities.
- **One render error blanked the whole app**, which on a device-local register looks exactly
  like lost data. `components/error-boundary.tsx` offers reload first and a confirmed
  destructive reset second; verified by forcing a real render throw.

CI now installs from the lockfile with `npm ci`, runs an advisory production audit, and fails
if a credential-shaped value is committed outside `.env.example`.

# The thesis, computed instead of asserted

`SAME JOBS / SAME WORKERS / DIFFERENT RULE` was a three-cell strip showing a job count, a member
count and a policy version. It stated the product's entire argument and proved none of it; a
judge had to take on faith that a different rulebook would treat the same people differently.

`lib/rule-comparison.ts` now runs the same demand, over the same members, from the same starting
workloads, under two named rulebooks, and reports what each one did. On the seeded register:
10 of 13 members earn under this cooperative's constitution and 5 do under rating-ranked
dispatch; the cooperative rule hands new work to a member already at their own limit 0 times
and the other does it 11 times. Nothing in that sentence is written into the UI — it is
computed, and the headline is assembled from the computed numbers.

Honesty constraints the module holds to, with tests pinning each:

- The alternative is a **rule definition**, stated in full on screen, not a claim about any
  company. A test fails if a brand name appears in the rulebook copy.
- The protection claim is precise. The cooperative guard refuses to **start** a member on new
  work once they are at their limit; it does not stop a job already underway from running past
  it. An earlier draft of the headline overclaimed ("never sent anyone past the limit") and the
  test suite caught it. The metric that separates the rulebooks is `jobsPastSafeLimit` — work
  handed to someone *already* at or over the line. Members who finish slightly over are marked
  and the mark is explained in words, including in the cooperative's own column.
- Members who earn nothing are each told why, and a protection holding work back is never
  reported as the same thing as being passed over.
- The cost of the safe rule is shown, not hidden: at higher demand it leaves jobs unfilled
  rather than overworking anyone, and the panel says federation is how the customer is still
  served. A test asserts the unfilled count is non-zero at high demand.
- It is read-only. A test re-serialises the register after running it and asserts nothing moved.

Demand is synthetic, generated from the project's seed 26089, labelled as synthetic on screen,
and identical on every machine. The members, certifications, ratings and starting workloads are
the register's own records.

The visual leads the admin Overview, which is where someone landing on the app arrives, and
stays a footer everywhere else so it never crowds the work.

# Freeze

Feature work beyond this pass remains frozen. Remaining work is deployment/browser
verification, bug fixing, provider credential wiring or deeper Hindi/Marathi copy coverage.

# Product

KAAMSABHA2 is the active SIH26089 implementation workspace. `aadi-harale/KaamSabha` remains reference-only and was not modified. The final parity audit used that repository as behavioral/design reference and ported its important application-level worker-governance, mapping, Federation Opportunity Exchange and AI-assisted intake/policy-review mechanisms into the native Next.js/Vercel implementation.

# Final product state

Customer flow is service-first: discover/search five service categories -> configure location/schedule/emergency -> structured problem intake and optional reference filename -> home-cooperative-first dispatch -> protected federation fallback only when local safe capacity fails -> in-browser OpenStreetMap/OSRM tracking -> start OTP -> work proof -> Scope Lock/change approval -> completion OTP -> settlement/invoice -> 1–5 feedback/support. Low ratings create a cooperative review case through the Rating Firewall and do not alter worker activation or opportunity access. Accepted/travelling cancellations create an auditable worker-protection payment.

Worker flow is task-first. Today retains payout/scope, maps, safe decline, workability, OTPs, evidence and change orders. The five secondary tabs are now **Why this job?**, **Get help**, **Share an idea**, **My money** and **Our votes**. They use larger controls and plain English/Hindi/Marathi; frozen decision details remain expandable. Existing commands and repository persistence still create help requests, receipt-backed checks, suggestions, earnings records, policy reviews and ballots.

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

# Hindi and Marathi, and one-click demo scenarios

`lib/messages.ts` holds 216 whole sentences in English, Hindi and Marathi. Whole sentences,
not fragments: these messages carry names and numbers, and both Indic languages put the verb
last and attach postpositions to the noun, so the old approach of joining English pieces
produces word salad in them. Each language writes its own word order around named placeholders.
Register is ordinary spoken Hindi and Marathi with respectful second person, not Sanskritised
officialese — the reader is a member being told why they did or did not get paid.

Coverage is the member's own workflow, end to end: the nine-step job flow in both vocabularies,
every allocation explanation and its frozen figures, the "why you have no job right now" panel,
the OTP panels, the Fair Work hero and receipt grid, and the whole worker side of Replay Court
including its six challenge categories. Seeded members carry a `nameDevanagari` form, so a
Marathi screen does not end with one Latin name in the middle of a sentence. A browser check
counts the untranslated strings left on the worker workspace: three, and all three are machine
identifiers (`KMS-00002`, `constitution-v2`) that should not be translated.

Deliberately **not** translated, and this is a decision rather than an omission: cooperative
operations, governance and the admin side of Replay Court. They are record-first tools for an
administrator, and a half-translated audit trail is worse than an untranslated one. The
rule-comparison panel is also English — it is the argument aimed at an evaluator, not part of
the member's work. English remains the default, so nothing changes language on its own.

Tests pin that every key exists in both languages, that no message renders a leftover
`{placeholder}`, that Hindi and Marathi are neither English copies nor copies of each other,
that a member's numbers survive translation, and that the operations voice stays English even
when the member reads Hindi. The translations have not been reviewed by a native speaker; that
is recorded in `PRODUCTION_READINESS.md` as outstanding.

`lib/demo-scenarios.ts` seeds seven stories in one click from the login screen: a member passed
over on turn order, a protection holding work back, a job waiting for its start code, work
under way with proof added, a job leaving its own cooperative, and a safe decline with the
re-dispatch, and Ravi's paid work, cancellation and new offer. Each runs the same commands a
person would — nothing writes a job, receipt or
settlement directly — so what appears afterwards is the product working with the clicking done
for you. A test asserts every receipt a scenario leaves carries a frozen candidate set, exactly
as a hand-driven booking would, that scenarios are idempotent, that one does not leave the
previous one's jobs behind, and that each ends signed out so a judge chooses a role
deliberately rather than inheriting one.

# Verified worker simplification (2026-10-05)

- Worker-only styles and `lib/worker-copy.ts` supply simpler labels, readable text, large radio choices and optional details. Phone navigation shows all six tabs in two rows rather than hiding labels in a scrolling bottom bar. The compact header was inspected and corrected at 320px.
- Help takes a familiar problem, a job (or general request) and optional details. Real notes persist. Ideas use one short message; the title is derived from that message for the existing admin register. Legacy help categories still display familiar labels.
- Earnings is a normal tab rather than a click-intercepted overlay. It reconciles seeded history with actual settlements/cancellation payments, labels sample versus live demo entries and exposes all payments/breakdown.
- Voting shows the actual saved before/proposed pay and wait values, requires impact review, offers no preselected vote, requires a reason for disagreement, and locks an existing ballot. Activated proposals display their approved state. Quorum and activation commands are unchanged.
- Sign-out now passes the saved signed-out state directly to DemoShell. Fast account switches no longer depend on its 700ms session poll.
- Production browser walkthrough: electrical job KMS-00002 dispatched to Ravi/W02 under constitution-v2 at ₹760; worker accepted and inspected the frozen receipt. Help ISS-00006 gained two notes; a safety idea appeared in admin and returned as under-review. Customer cancellation posted ₹190, moving Ravi's recorded earnings ₹7,160 → ₹7,350. Ravi reviewed/voted; the nine stored votes permitted admin activation of constitution-v3 at ₹860. New plumbing job KMS-00025 selected Leela/W13 under v3. Farhan/W12 challenged that receipt, admin replayed/confirmed/closed it, and Farhan saw the recorded answer. Refresh preserved both jobs, request/notes, idea, earnings, ballot/review, policy and closed challenge. No browser page errors occurred.
- All five tabs passed 60 layout checks: English, Hindi, Marathi × 320/768/1024/1440px, with no horizontal page scroll or clipped navigation. Fourteen desktop/mobile screenshots were captured outside Git and representative screens visually inspected. Keyboard radio selection, 3px visible focus and reduced-motion preference were checked. Scoped axe WCAG A/AA audits reported zero violations; governance's generic-div ARIA label was fixed and rechecked with zero incomplete results. Decorative-symbol contrast exceptions were visually checked.
- Final commands passed: `npm test` (118/118), `npm run typecheck`, `npm run lint` (the existing TypeScript alias), `npm run build`, `git diff --check`. New UI translations still need native-speaker and real worker usability review; this pass establishes simpler flows, not evidence of field validation.
- Verification artifacts on this device: `C:/Users/AADI/Downloads/kaamsabha2-worker-walkthrough.json` and `C:/Users/AADI/Downloads/kaamsabha2-worker-screenshots/`. No test records or credentials were added to the repository.

# Verified worker home earnings (2026-10-05)

- Today now shows the signed-in worker's total recorded earnings and paid-job count before the current job or queue, with a keyboard-operable See payments button. It derives from the same `summarizeWorkerEarnings` ledger as My money, in English/Hindi/Marathi; demo amounts remain labelled.
- Login shortcut "Ravi's earnings and a new job" explicitly resets the register, then uses existing commands to produce a settled electrical job, an accepted-job cancellation and an unpaid appliance offer, each with a frozen dispatch receipt. Default history remains untouched. Only spent scenario OTP tokens are stubbed, as in the existing mid-job shortcut.
- Production browser walkthrough selected the shortcut through the UI: ₹7,160 sample history + ₹760 settlement + ₹190 cancellation = ₹8,110, nine paid jobs. Offer KMS-00030 remained unpaid through acceptance, travel, real server-issued start/finish code verification and work proof. Its customer demo checkout raised both earnings views to ₹8,870 (ten paid jobs); another accepted electrical booking/cancellation raised both to ₹9,060 (₹380 total cancellation protection). Refresh preserved jobs, settlements, cancellations and the amount. Meena's own ₹7,030 stayed separate. No page errors occurred.
- Twelve home-layout checks passed: three languages × 320/768/1024/1440px, no page overflow or clipped controls. Desktop/mobile screenshots were captured and inspected; keyboard payment navigation showed a 3px focus outline, and reduced-motion mode was checked. The home summary uses a quiet work-slip layout without extra charts or decorative icons.
- Passed: `npm test` (120/120), `npm run typecheck`, `npm run lint` (existing TypeScript alias), `npm run build`. Browser evidence: `C:/Users/AADI/Downloads/kaamsabha2-home-earnings-check.json`; screenshots: `C:/Users/AADI/Downloads/kaamsabha2-worker-screenshots/home-earnings-*.png`. These isolated test records were not written to the user's browser or committed.

# Verified worker guidance and member outcomes (2026-10-05)

- Today presents agreed work/pay and one lifecycle action before expandable map, progress,
  safe decline, scope addition and work limits. Existing commands and OTP verification remain
  authoritative. Maps mount on request. The mobile header/earnings layout was tightened after
  inspecting screenshots. Activated ballot details are collapsed to remove repeated outcomes.
- Listen provides authored English/Hindi/Marathi summaries of the signed-in member's saved
  records, with stop/cancel, errors and a readable transcript. It selects a matching device
  voice; no unrelated-language fallback, paid provider or library was added. Ten controlled
  speech-adapter checks passed, including language, ledger text, end/error and cancellation
  on tab/language change. The initial native Chrome voice inventory was empty: audible
  playback on the actual demo device remains unverified and device-dependent.
- My money distinguishes paid work, cancellation protection and completed work awaiting
  payment. The real OTP/proof/checkout walkthrough preserved ₹8,110 until settlement, then
  raised it to ₹8,870; a later accepted-job cancellation raised it to ₹9,060. Refresh
  preserved the records and Meena's separate ₹7,030.
- Vote outcomes derive from the current activated proposal, saved ballots and later frozen
  receipts. Browser proof: Ravi's ninth yes ballot enabled constitution-v3, ₹760 → ₹860;
  Leela's new KMS-00025 receipt used v3/₹860 while the earlier receipt remained v2. Help notes
  and idea review persisted. Farhan's new-job challenge showed received → replayed → answered
  and closed, with the actual cooperative reply. A capture summary no longer falsely marks
  replay complete; human review keeps the final answer pending.
- Real control checks saved six-hour/60-minute work limits, mounted the map, approved a ₹180
  pre-start addition (₹940 total), kept work locked pending approval, and safely declined
  another offer with zero penalty and re-dispatch. No page errors occurred in these flows.
- Seventy-two responsive checks passed across three languages and four required widths.
  Desktop/mobile screenshots were captured outside Git and inspected. Keyboard focus and
  reduced motion passed. Ten worker-shell axe WCAG A/AA audits reported zero violations after
  fixing header contrast; decorative glyph contrast remains axe's manual-review exception.
- Passed: `npm test` (125/125), `npm run typecheck`, `npm run lint` (existing TypeScript alias),
  `npm run build`, `git diff --check`. Evidence: device-local
  `C:/Users/AADI/Downloads/kaamsabha2-worker-guidance-{walkthrough,controls,a11y}.json`, the
  existing home-earnings report and screenshot directory. No test register was written to the
  user's browser. Browser policy blocked access to that tab; the user must refresh it.
  Native-speaker and field usability review remain outstanding.

# Freeze

Feature work beyond this pass remains frozen. Remaining work is deployment/browser
verification, bug fixing, provider credential wiring or deeper Hindi/Marathi copy coverage.

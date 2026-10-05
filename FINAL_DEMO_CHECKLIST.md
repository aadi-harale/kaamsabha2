# KaamSabha product walkthrough

Use the same browser profile so the deterministic register persists across logouts. The strongest story is: familiar customer marketplace -> pre-start Scope Lock -> worker protections and voice -> AI-assisted collective policy review -> executable member governance -> operational federation transfer.

## 0. Open with the argument (15 seconds)

1. Sign in as `admin` (password `12345`). Overview shows live register totals and a presentation path, followed by
   **SAME JOBS / SAME WORKERS / DIFFERENT RULE**. The comparison has one home, not a duplicate on every admin page.
2. Read the line out: *"Same 32 jobs. Same 13 certified members. One thing changed: the rule."*
3. Point at the two columns. Ten members earn under this cooperative's constitution; five earn
   under rating-ranked dispatch. The cooperative rule handed work to someone already at their own
   limit zero times; the other rule did it eleven times.
4. If asked where the numbers come from, open **How is this calculated?**: synthetic demand from
   seed 26089, the register's own members and ratings, identical on every machine, read-only, and
   the alternative stated as a rule definition rather than an accusation about any company.
5. Note the two honest edges rather than waiting to be asked — they are the strongest part of the
   argument. The cooperative column carries a † where a member finished slightly over their limit
   because a job they had already started ran past it, and it leaves a job unfilled rather than
   overworking anyone. Federation (section 6) is the answer to that.

## 1. Customer: normal marketplace first

1. Sign in as `customer` (every demo account uses password `12345`).
2. Home -> show the five services: Electrical, Cleaning, Appliance repair, Plumbing and Carpentry.
3. Choose Electrical in `Kharadi, Pune`, add a problem description/reference name, optionally show AI intake assistance, then confirm.
4. Point out that Kharadi has a local eligible electrician, so the home cooperative serves the request before federation is considered.
5. Orders -> show assigned worker, protected amount, booked scope and the in-browser OpenStreetMap/OSRM route.
6. Click the compact map or its expand button. It opens the large interactive map with pan/zoom; ESC or the close button returns to the booking.

## 2. Worker + customer: pre-start Scope Lock and full job lifecycle

1. Log out and sign in as the assigned worker (`ravi` for the default Kharadi Electrical path). Workers sign in with their first name in lowercase.
2. Current -> show protected payout, booked scope, Workload Safety Guard and route.
3. Demonstrate that **Safely decline** explicitly records zero opportunity/rating penalty, or accept the job for the full lifecycle.
4. Accept -> Start travel -> Mark arrived.
5. At arrival, show the new **Scope Check · Before Start OTP** workspace.
6. Explain the invariant: the worker must not begin added work just because the customer verbally requested it. If the customer asks for an extra switch/socket/task, the worker records the description and price delta and clicks **Send addition for approval**.
7. The job moves to `change_pending`. The worker sees a waiting banner and cannot start the added work. Any already-issued start OTP is invalidated when scope changes.
8. Log in as customer -> Orders -> review the exact additional scope and added amount. Choose either:
   - **Approve addition** -> amount updates while respecting the Worker Protection Floor; or
   - **Keep original scope** -> original scope and price remain active.
9. After the decision, the job returns to `arrived`. Customer clicks **Issue the start code**. The code, its countdown and the attempts left are shown on the booking and are held with the job, so a reload or a sign-out no longer loses them.
10. Log in as worker. The start-code panel names the code under a **Demo delivery** label (it stands in for the SMS a real customer would read out) and shows attempts left and time remaining. Enter it -> job moves to `started`.
    - Worth showing: a wrong code costs one attempt and says how many are left; an expired code costs nothing and tells the worker to ask for a new one.
11. Worker opens **Add work proof**, explains what was done, names any parts and why they were needed, records the result check and clicks **Save proof**. Optionally attach a real JPG/PNG/WebP/MP4/WebM up to 2 MB. At arrival, **Save before-work proof** records the initial condition. Files persist on this device; text-only proof remains a member statement.
12. Customer reviews proof and clicks **Approve the proof and issue the finish code**. It is a different code from the start code and is bound to this job.
13. Worker enters the finish code -> job becomes `completed`.
14. Customer opens **Pay ₹… · Demo checkout**.
15. Show the Razorpay-style demo sheet with UPI / Card / Netbanking choices. Explicitly point out the label: **no real transaction or Razorpay API call occurs**.
16. Click **Simulate payment**, show the success state, then **Post settlement & close**. This creates the KaamSabha invoice and protected worker payout in the shared ledger.
17. After payment the booking closes. The Orders screen hands the customer straight to the invoice with **See the invoice and rate this job** rather than dropping them on an empty tab.
18. Feedback -> optionally choose 1–2 stars to demonstrate the Rating Firewall: a human-review case is opened but worker activation/access does not change.

Throughout, point at the nine-step progress track and the **Your next step** card. Both sides read the same step list in their own words, and exactly one side is ever told it is their move, so nobody has to guess who is holding the job up.

## 3. Why a member did or did not get the job

This is the part a worker actually cares about, and it is reconstructed from the figures frozen at the moment of the decision, never from today's register.

1. As `customer`, book **Plumbing** in `Kharadi, Pune`. Two Kharadi members are free, so one is chosen and one is not.
2. Sign in as `leela` (chosen) and then as `farhan` (not chosen).
3. `farhan` lands on **Why you have no job right now**: the five checks dispatch runs on him, each marked passing or needing attention in words rather than colour alone, and the last job that went elsewhere with the reason.
4. Worker -> **Fair Work** -> *Why you did or did not get a job*. Filter to **Didn't get**.
5. Read the sentence out: *"Leela Waghmare went ahead of you because they had 150 min booked that day against your 300 min — 150 min less. Work is spread toward whoever has least, not toward whoever is cheapest or best rated."*
6. Click **Show the exact figures used**: the rulebook version, the protected payout, the protection floor, and the frozen turn order with his own row highlighted.
7. Point out the line under it: missing out has no effect on rating and does not reduce future offers. The same card offers Replay Court if he still disagrees.
8. Now book **Electrical** in Kharadi and sign in as `sunita`. Her reason is different and names the protection: *"Workload safety guard: you were already at 420 min of your 420 min limit for that day."* A protection stopping a job is not a mark against the member.
9. Sign in as `admin` -> **Jobs & decisions** -> choose the booking -> **Dispatch decision and frozen inputs**: every member the decision looked at, in the order the rulebook applied, with the same reason the member sees — worded for operations rather than addressed to the reader.
10. Book **Carpentry** in Kharadi, where no local member is certified. The receipt also freezes the home cooperative's candidate set, so a Kharadi member can still be told their cooperative had no safe capacity and that federation compared cooperatives, never individual workers.

## 4. Worker: prove Fair Work and member voice

1. Worker -> Why this job?.
2. Show the frozen Decision Receipt and the persisted **Opportunity Access Normalization** ledger: only hard-eligible offers count; safe declines have opportunity penalty `0`.
3. Open a Replay Court challenge for the decision.
4. Worker -> Get help. Explain the four distinct paths:
   - current-job problem -> Issue;
   - past allocation looks wrong -> Replay Court;
   - future rule looks wrong -> Share an idea;
   - proposal on ballot -> Our votes.
5. Raise one worker-origin issue such as `Safety / workability` or `Payment / payout` so the collective-policy monitor has real member voice to analyze.
6. Worker -> Share an idea -> submit a plain-language policy suggestion and show its visible status.
7. Worker -> Our votes -> show personal Policy Twin impact. The worker must confirm review before voting. A no vote requires a short dissent reason; one member can vote only once.
8. For the deterministic judge proposal, `W01/W03-W09` already represent eight member votes. `W02` can review impact and cast the ninth vote to demonstrate quorum.

## 5. Admin: member voice, Policy Twin and activation

1. Sign in as `admin` (demo password `12345`). The left menu groups service operations,
   member decisions and planning. On a phone, open **Workspace menu**.
2. **Replay Court** -> choose the worker challenge -> **Run frozen replay** -> record the
   matching finding or human review -> remedy/close when appropriate. The original receipt remains frozen.
3. **Member ideas** -> **Start review** or **Accept for development**. This does not create
   a proposal or activate a rule; fresh proposal authoring is not part of this UI pass.
4. **Governance -> Collective Pattern Court** -> **Analyze all member voice**. Review the
   stored themes and draft. AI is advisory; it cannot dispatch, punish, set pay, vote or activate.
5. **Governance -> Rules & member votes** -> choose the saved proposal. Read the current
   active constitution above, then the before/proposed payout comparison.
6. **Inspect each job in the comparison** shows actual replayable job receipts, including
   bookings created in this browser session. Missing/inconsistent frozen inputs are excluded.
   This is a counterfactual comparison, not pay already earned. The waiting variable is
   stored only; it has no selection or arrival-time effect.
7. **Protection checks & sandbox** -> **Test a paid-priority proposal**. It must be blocked.
   The vote sandbox does not cast real votes and rejects counts above registered membership.
8. Return to **Rules & member votes**. Nine participants and seven Yes votes are required.
   Inspect saved ballots and dissent; workers cast their own votes in **Our votes**.
9. **Activate member-approved constitution** is enabled only for an eligible open ballot.
   Activation advances v2 to v3 and the floor from ₹760 to ₹860. Existing receipts remain v2.
10. Book again as customer; inspect the new receipt in **Jobs & decisions**. It must use v3/₹860.
    After activation the earlier proposal comparison is labelled as a historical baseline,
    while the active-rule strip shows the real current floor.

## 6. Admin: Federation — shortage, cooperative, member, receipts

1. Open **Federation -> Transfers**. The three numbered steps are an actual sequence:
   find a shortage, choose a cooperative, inspect both receipts.
2. **Prepare a capacity request**: choose Kharadi, Carpentry and a 35-minute customer arrival
   promise for the default live demo. Choose a real waiting booking if one exists, or explicitly
   choose **Create a demo overflow job**. The command refuses overflow while local safe capacity exists.
3. Click **Check receiving cooperatives**. A real job/request is saved. Review the candidate
   list: on the baseline register Yerawada has one safe carpenter at a 26-minute planning arrival;
   Viman Nagar and Hadapsar have no safely available qualified member. These values are live.
4. Optionally **Open control map**. It displays locality anchors, not worker addresses.
   Pan/zoom and eligible cooperative selection are available; keyboard focus stays inside the
   dialog, and Escape returns to the trigger. Map tiles need internet; the capacity records
   remain usable when tiles fail. Planning estimates are geography/workload estimates, not GPS.
5. Review origin, receiver, capacity, planning arrival and payout protection. Click
   **Confirm job transfer**. Capacity is checked again; federation chooses the cooperative,
   then that cooperative's own constitution selects its member. No central worker picker exists.
6. The app opens **Receipts** for the transferred job. The default carpenter is Nikita More
   in Yerawada, with ₹760 under v2 (or at least ₹860 after policy activation).
7. Read **Receipt 1: why this cooperative?** and the rejected-cooperative reasons. Click
   **Replay frozen federation receipt**. Read the real stored result rather than assuming confirmation.
   A manually chosen eligible alternative may differ from the engine's deterministic replay choice.
8. Read **Receipt 2: why this member?** -> **Inspect the frozen member candidates**. The
   assigned job also appears in **Jobs & decisions**, the customer's Orders and the member's Today.
9. **Live capacity** shows each cooperative/service cell, including work-limit blocks and waiting
   jobs. A cell opens the request builder for that exact pair, even when other requests exist.
10. A request with no eligible receiver remains in **Transfers** with an explicit blocked outcome.
    It does not vanish or claim success. Start another request when capacity/promise changes.
11. **Receipts** also contains a labelled seeded electrician example: Kharadi unavailable,
    Yerawada two safe members at 24 minutes, Viman Nagar blocked by workload, Hadapsar outside
    the 35-minute promise. It names Meena Jadhav, but the seeded worker receipt is absent from
    the application job register. Use the live transfer above to demonstrate both real receipts.
12. Expand **Federation Policy Twin** only when asked: it uses twelve fixed synthetic scenarios,
    not today's bookings. The illustrative settlement split is separately labelled and is excluded
    from the Payments register totals.

Return to **Overview** to reconcile the session: bookings, completed jobs, unique members offered
work and recorded job payouts. Sample worker history and synthetic comparison demand are excluded.
**Payments** separately lists each settlement and cancellation-protection record. Refresh and
confirm the records, active policy, ballots, transfer receipts and closed challenge persist.

## 7. Close with the thesis

Use the SAME JOBS / SAME WORKERS / DIFFERENT RULES visual and summarize the product in one sentence:

**To customers KaamSabha behaves like a trusted local-services marketplace; underneath it is a worker-owned, executable constitution where members can understand, challenge, suggest, collectively surface patterns, simulate, vote on and change the rules that determine access to work—while federation moves demand between autonomous cooperatives without turning workers into one cheapest-worker pool.**

## Provider truthfulness

- Leaflet/OpenStreetMap renders in-browser. Compact maps intentionally behave as clean previews; click opens a large interactive map. The federation dialog uses a quiet white surface and plain backdrop. OSRM supplies road geometry, distance and duration; failure falls back to a labelled approximate route. Worker service positions are deterministic illustrative positions, not production live GPS or home addresses.
- OpenRouter is optional and server-only. `/api/ai/intake` structures customer intake. `/api/ai/policy` clusters worker-origin issues/suggestions for human governance review. Both have deterministic/manual fallbacks and neither can make consequential dispatch, pay, penalty, challenge, voting or activation decisions.
- The reliable judge source of truth is the versioned browser demo register. Supabase remote mirroring is optional provider wiring; hosted RLS/Realtime/private-storage behavior is not claimed unless separately configured and verified.
- The default checkout is deliberately labelled **DEMO PAYMENT**. It does not call Razorpay or move money. Optional **Razorpay test payments** in Admin → Payments requires local test credentials and an operator-approved server invoice. It uses a real order, signature and exact captured-payment check; Route transfers are recorded separately from bank settlement. See [PAYMENT_SETUP.md](PAYMENT_SETUP.md). A successful actual provider checkout/transfer has not been verified on this machine.

## Optional safety and continuity demonstration

Use a fresh isolated register for these reproducible starting values; do not reset an existing user/payment register.

1. Customer books Plumbing in Kharadi for ₹760. Leela receives the one live offer.
2. Leela accepts, travels and arrives. Save before-work proof, use the customer's start code, and save an explanation/proof of work already done.
3. Open **I need to stop this job**, choose a reason and describe remaining work. The offer releases, her availability pauses, and the original receipt/proof stays intact without a rating/opportunity penalty.
4. Customer opens Orders → **Agree and find a replacement**. Farhan receives one offer for the same booking and a new receipt. If the floor rose in between, the customer must consent to the revised remaining-service quote before dispatch.
5. Farhan uses fresh start/finish codes and saves his own after-work proof. An earlier member's proof cannot finish his job. The customer can inspect both records.
6. Admin → Jobs & decisions records the interrupted-work pay review, funding and next action. This is a human review note, not a transfer or a promise that earlier labour has been paid.
7. Either role can use **Safety & help** to report an unapproved helper, unlisted charge, damage, payment or safety concern. Admin → Help requests saves an actual cooperative reply before closure. **SOS: Call 112** opens the phone dialer; it does not send an external alert/location.
8. Optional AI proof review needs explicit consent and a compatible configured `OPENROUTER_PROOF_MODEL`. It supplies observations/questions for a human. An unavailable provider or oversized proof record stays explicitly unreviewed; inspect the saved proof with the cooperative.
9. After the human pay review, the normal local demo checkout records ₹760 for Farhan, taking his sample-plus-demo earnings from ₹7,800 to ₹8,560. No real money moves.
10. Ravi's ninth Yes vote and admin activation produce v3/₹860. A new booking uses it while the earlier agreed job stays ₹760. Overview traces two bookings, one completion, two members offered work and ₹760 recorded job payout; refresh preserves these actions and the real proof files.

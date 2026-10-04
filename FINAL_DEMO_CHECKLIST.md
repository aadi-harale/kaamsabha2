# KaamSabha final SIH judge walkthrough

Use the same browser profile so the deterministic register persists across logouts. The strongest story is: familiar customer marketplace -> pre-start Scope Lock -> worker protections and voice -> AI-assisted collective policy review -> executable member governance -> operational federation transfer.

## 1. Customer: normal marketplace first

1. Sign in as `customer` (every demo account uses password `12345`).
2. Home -> show the five services: Electrical, Cleaning, Appliance repair, Plumbing and Carpentry.
3. Choose Electrical in `Kharadi, Pune`, add a problem description/reference name, optionally show AI intake assistance, then confirm.
4. Point out that Kharadi has a local eligible electrician, so the home cooperative serves the request before federation is considered.
5. Orders -> show assigned worker, protected amount, booked scope and the in-browser OpenStreetMap/OSRM route.
6. Click the compact map. It should open the large glassmorphism interactive map with pan/zoom; ESC or the close button returns to the booking.

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
11. Worker adds work proof.
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
9. Sign in as `admin` -> Overview -> **Allocation record**: every member the decision looked at, in the order the rulebook applied, with the same reason the member sees — worded for operations rather than addressed to the reader.
10. Book **Carpentry** in Kharadi, where no local member is certified. The receipt also freezes the home cooperative's candidate set, so a Kharadi member can still be told their cooperative had no safe capacity and that federation compared cooperatives, never individual workers.

## 4. Worker: prove Fair Work and member voice

1. Worker -> Fair Work.
2. Show the frozen Decision Receipt and the persisted **Opportunity Access Normalization** ledger: only hard-eligible offers count; safe declines have opportunity penalty `0`.
3. Open a Replay Court challenge for the decision.
4. Worker -> Issues. Explain the four distinct paths:
   - current-job problem -> Issue;
   - past allocation looks wrong -> Replay Court;
   - future rule looks wrong -> Speak up;
   - proposal on ballot -> Governance.
5. Raise one worker-origin issue such as `Safety / workability` or `Payment / payout` so the collective-policy monitor has real member voice to analyze.
6. Worker -> Speak up -> submit a plain-language policy suggestion and show its visible status.
7. Worker -> Governance -> show personal Policy Twin impact. The worker must confirm review before voting. A no vote requires a short dissent reason; one member can vote only once.
8. For the deterministic judge proposal, `W01/W03-W09` already represent eight member votes. `W02` can review impact and cast the ninth vote to demonstrate quorum.

## 5. Admin: Collective Pattern Court + constitution activation

1. Log in as `admin01`.
2. Cases -> find the worker challenge -> open the Replay Court workspace and run the frozen replay. Explain that frozen decision inputs/policy are replayed rather than today's worker state.
3. Suggestions -> review the worker suggestion. Accepting an idea does **not** activate policy.
4. Governance -> show **Collective Pattern Court · Policy Signal Monitor**.
5. Click **Analyze all member voice**. The system reads worker-origin issues plus policy suggestions and clusters repeated themes.
6. Show the returned theme cards, severity/count, evidence snippet and `DRAFT FOR DISCUSSION — NOT EXECUTABLE POLICY`.
7. Explicitly point out the guardrail: AI cannot rank workers, punish/deactivate, dispatch, set pay, vote, decide Replay Court outcomes or activate policy. If OpenRouter is unavailable, the deterministic category/keyword fallback keeps this flow working and labels the mode.
8. Continue to the Worker Protection Validator and Counterfactual Policy Twin.
9. Click **Test a paid-priority proposal** -> it must be blocked.
10. Show ballot participation (`9 / 9`) and support threshold (`>= 7`).
11. Activate the member-approved constitution. The active version advances (v2 -> v3), while existing Decision Receipts remain frozen under v2.
12. A later booking must use v3 and the new ₹860 floor.

## 6. Admin: Federation Operations — main wow sequence

Federation is an operations console, not an information page.

### A. Create a genuine capacity request

1. Open **Federation -> Requests**.
2. Choose a home cooperative/service pair that the live shortage finder shows as having zero safe capacity, then choose the customer SLA.
3. Freeze capacity and open the overflow request.
4. Explain that the command layer refuses federation if the home cooperative still has safe local capacity. Federation is only for genuine overflow.
5. The new overflow job/request appears in **Jobs waiting for federation**.

### B. Route the job using the interactive control map

1. Open the request -> **Control map**.
2. The compact map is a clean preview; click it to open the large glassmorphism Leaflet/OpenStreetMap control map.
3. Inspect cooperative markers and candidate states. Only eligible cooperatives can be selected.
4. Choose an eligible receiving cooperative either on the expanded map or in the candidate list.
5. Review the transfer panel: service, safe capacity, planning ETA, worker-protection floor and the fact that worker selection belongs to the receiving cooperative.
6. Click **Initiate job transfer**.
7. Verify the result: the job is routed to the cooperative first; only then does that cooperative's own constitution select its worker. Admin never chooses a cheapest network-wide worker.

### C. Show the capacity application

1. Open **Capacity**.
2. Show the cooperative x service matrix derived from current worker skills, workability and active jobs.
3. Green/amber/red cells expose safe capacity, constrained capacity, workload blocks and waiting demand.
4. Explain that the matrix guides where demand can move; the actual transfer still re-checks eligibility, SLA and worker protection.

### D. Audit completed transfers

1. Open **History & receipts**.
2. Show the completed transfer with home cooperative -> receiving cooperative -> receiving cooperative's worker.
3. Show **Receipt 1 / federation** and **Receipt 2 / worker**.
4. Run the frozen federation replay. Frozen capacity/protection/SLA inputs must reproduce the cooperative decision.
5. Show the illustrative settlement and the Local-only vs Federation Mesh Policy Twin.

### E. Seeded golden federation proof for the judges

The historical deterministic judge vector remains available to prove the policy engine:

- Kharadi: safe electrician capacity `0`;
- Yerawada: `2` available at `24 min`, eligible/selected;
- Viman Nagar: `21 min`, but workload protection blocks it;
- Hadapsar: `39 min`, outside the `35 min` customer promise;
- federation selects Yerawada first;
- Yerawada's own constitution then selects Meena Jadhav.

The deterministic Federation Twin shows the same 12 capacity scenarios:
- Local only: `0 served`, `12 unfilled`;
- Federation Mesh: `11 served`, `1 unfilled`, `22.5 min` average ETA, `25 min` p90, `11` cross-coop, `0` protection violations.

After activating the ₹860 floor, later federation transfers/proofs must preserve ₹860. Federation cannot silently fall back to ₹760.

## 7. Close with the thesis

Use the SAME JOBS / SAME WORKERS / DIFFERENT RULES visual and summarize the product in one sentence:

**To customers KaamSabha behaves like a trusted local-services marketplace; underneath it is a worker-owned, executable constitution where members can understand, challenge, suggest, collectively surface patterns, simulate, vote on and change the rules that determine access to work—while federation moves demand between autonomous cooperatives without turning workers into one cheapest-worker pool.**

## Provider truthfulness

- Leaflet/OpenStreetMap renders in-browser. Compact maps intentionally behave as clean previews; click opens a large interactive glassmorphism map. OSRM supplies road geometry, distance and duration; failure falls back to a labelled approximate route. Worker service positions are deterministic illustrative positions, not production live GPS or home addresses.
- OpenRouter is optional and server-only. `/api/ai/intake` structures customer intake. `/api/ai/policy` clusters worker-origin issues/suggestions for human governance review. Both have deterministic/manual fallbacks and neither can make consequential dispatch, pay, penalty, challenge, voting or activation decisions.
- The reliable judge source of truth is the versioned browser demo register. Supabase remote mirroring is optional provider wiring; hosted RLS/Realtime/private-storage behavior is not claimed unless separately configured and verified.
- The Razorpay-style checkout is deliberately labelled **DEMO PAYMENT**. It does not call Razorpay, move money, tokenize card data, create a UPI collect request, or claim escrow/regulated clearing. Its only effect after the simulated success screen is to post the existing deterministic KaamSabha settlement/invoice record.

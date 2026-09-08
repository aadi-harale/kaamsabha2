# KaamSabha final SIH judge walkthrough

Use the same browser profile so the deterministic register persists across logouts. The recommended story is customer service first, then worker protections/voice, then cooperative governance/federation proof.

## 1. Customer: normal marketplace first

1. Sign in as `customer01`.
2. Home -> show the five services: Electrical, Cleaning, Appliance repair, Plumbing and Carpentry.
3. Choose Electrical in `Kharadi, Pune`, add a problem description/reference name, optionally show intake assistance, then confirm.
4. Point out that Kharadi has a local eligible electrician, so the home cooperative serves the request before federation is considered.
5. Orders -> show assigned worker, protected amount, booked scope and the in-browser OpenStreetMap/OSRM route.

## 2. Worker: complete the job with protections

1. Log out and sign in as the assigned worker (`W02` for the default Kharadi Electrical path).
2. Current -> show protected payout, scope, Workload Safety Guard and route.
3. Demonstrate that **Safely decline** explicitly records zero opportunity/rating penalty, or accept the job for the full lifecycle.
4. Accept -> Start travel -> Mark arrived.
5. Log in as customer -> issue start OTP. Return to worker -> verify start OTP.
6. Worker -> add work proof -> optionally request the +₹180 Scope Lock change.
7. Customer -> approve/decline change -> review proof -> issue completion OTP.
8. Worker -> verify completion OTP.
9. Customer -> settle invoice.
10. Feedback -> optionally choose 1–2 stars to demonstrate the Rating Firewall: a human-review case is opened but worker activation/access does not change.

## 3. Worker: prove Fair Work and member voice

1. Worker -> Fair Work.
2. Show the frozen Decision Receipt and the persisted **Opportunity Access Normalization** ledger: only hard-eligible offers count; safe declines have opportunity penalty `0`.
3. Open a Replay Court challenge for the decision.
4. Worker -> Issues. Explain the four distinct paths:
   - current-job problem -> Issue;
   - past allocation looks wrong -> Replay Court;
   - future rule looks wrong -> Speak up;
   - proposal on ballot -> Governance.
5. Worker -> Speak up -> submit a plain-language policy suggestion and show its visible status.
6. Worker -> Governance -> show personal Policy Twin impact. The worker must confirm review before voting. A no vote requires a short dissent reason; one member can vote only once.
7. For the deterministic judge proposal, `W01/W03-W09` already represent eight member votes. `W02` can review impact and cast the ninth vote to demonstrate quorum.

## 4. Admin: Replay Court and constitution activation

1. Log in as `admin01`.
2. Cases -> find the worker challenge -> click **Replay frozen decision**. Explain that frozen decision inputs/policy are replayed rather than today's worker state.
3. Suggestions -> review a worker suggestion. Accepting an idea does **not** activate policy.
4. Governance -> show the Worker Protection Validator and Counterfactual Policy Twin.
5. Click **Test a paid-priority proposal** -> it must be blocked.
6. Show ballot participation (`9 / 9`) and support threshold (`>= 7`).
7. Activate the member-approved constitution. The active version advances (v2 -> v3), while existing Decision Receipts remain frozen under v2.
8. A later booking must use v3 and the new ₹860 floor.

## 5. Admin: Federation Opportunity Exchange — main wow sequence

Open Federation and follow the page top-to-bottom:

1. **Pune Federation capacity map** — real in-browser OpenStreetMap:
   - Kharadi: home cooperative, safe electrician capacity `0`;
   - Yerawada: `2` available, `24 min`, selected;
   - Viman Nagar: `21 min` but workload protection blocks it;
   - Hadapsar: `39 min`, outside the `35 min` customer promise.
2. **Three-stage decision** — Kharadi home -> federation selects Yerawada -> Yerawada's own constitution selects Meena Jadhav.
3. **Live overflow request table** — capacity, ETA, protection compatibility and exclusion/result are shown per cooperative.
4. **Receipt 1 / federation** — why Yerawada received the opportunity.
5. **Receipt 2 / worker** — why Meena received the work only after Yerawada was selected.
6. Click **Replay frozen federation receipt** -> the frozen capacity/protection/SLA snapshot must reproduce the receiving cooperative.
7. **Illustrative settlement** under constitution v2: `₹900 = ₹760 worker + ₹40 welfare + ₹100 fulfilling cooperative`; no federation/home-cooperative fee is invented.
8. **Local only vs Federation Mesh Policy Twin** — same 12 capacity scenarios:
   - Local only: `0 served`, `12 unfilled`;
   - Federation Mesh: `11 served`, `1 unfilled`, `22.5 min` average ETA, `25 min` p90, `11` cross-coop, `0` protection violations.
9. After activating the ₹860 floor, **Run another proof**. The new federation settlement must follow the new floor: `₹1,000 = ₹860 worker + ₹40 welfare + ₹100 fulfilling cooperative`.

## 6. Close with the thesis

Use the SAME JOBS / SAME WORKERS / DIFFERENT RULES visual and summarize the product in one sentence:

**To customers KaamSabha behaves like a trusted local-services marketplace; underneath it is a worker-owned, executable constitution where members can understand, challenge, suggest, simulate, vote on and change the rules that determine access to work—without being allowed to vote away core worker protections.**

## Provider truthfulness

- Leaflet/OpenStreetMap renders in-browser. OSRM supplies demo road geometry, distance and duration; failure falls back to a labelled approximate route. Worker service positions are deterministic illustrative positions, not production live GPS or home addresses.
- OpenRouter is optional and intake-only. Manual booking remains available if it is unconfigured or unavailable.
- The reliable judge source of truth is the versioned browser demo register. Supabase remote mirroring is optional provider wiring; hosted RLS/Realtime/private-storage behavior is not claimed unless separately configured and verified.
- Payment settlement is a deterministic ledger demonstration, not an escrow/regulated-clearing claim.

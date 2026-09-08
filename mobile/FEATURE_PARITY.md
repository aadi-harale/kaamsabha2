# KaamSabha Mobile Feature Parity

Source of truth: `aadi-harale/kaamsabha2` web implementation and its `AGENTS.md` / `AGENT_STATE.md`.

## Customer
- Premium role login with KaamSabha brand panel.
- Urban Company-style service discovery for Electrical, Cleaning, Appliance Repair, Plumbing and Carpentry.
- Shared booking state with named worker assignment.
- Active booking, route preview, protected payout visibility.
- Scope Lock + worker change order + customer approve / keep-original decision.
- Scope change invalidates any previous Start OTP by design in the reducer.
- Distinct Start OTP and Completion OTP demo flow.
- Completion OTP gated behind proof-ready state.
- Razorpay-style **Demo payment** screen language; no claim of live regulated payment integration.
- Guided Help that creates admin-visible cases.

## Worker
- Named member login; internal W01-W10 IDs never need to be shown to ordinary users.
- Task-first Today view.
- Safe decline language with zero opportunity/rating penalty.
- Travel -> arrive -> scope check -> start -> proof -> completion lifecycle.
- Earnings overview, 6-week trend and protected earnings ledger.
- Fair Work explanation of eligibility gates.
- Replay Court entry point using the design principle: frozen decision-time evidence, never today's database.
- Worker Voice paths: current problem, past decision, future rule.
- Policy suggestion submission.

## Cooperative admin
- Operations metrics and live job register.
- Unified human-readable case inbox for customer support, Replay Court and worker suggestions.
- Rating / deactivation firewall language.
- Policy Twin presentation: SAME JOBS / SAME WORKERS / DIFFERENT RULES.
- Non-mutating voting simulation and guarded future-only activation.
- Protection Validator language: no reverse auctions, paid ranking or payout below the floor.
- Policy Signal Monitor shown as advisory only.
- Federation control map and candidate list.
- Federation invariant preserved: select receiving cooperative first; its own constitution selects its worker second.

## Invariants retained in this prototype
1. Worker protected payout floor is explicit.
2. Safe decline is described and modeled as zero-penalty.
3. Start and completion OTPs are distinct and job-bound in the shared booking object.
4. Pending Scope Lock blocks Start OTP generation in UI.
5. Scope change clears any previous Start OTP.
6. Proof is required before Completion OTP generation.
7. Low ratings are framed as human-review cases, not automatic deactivation.
8. Replay Court is explicitly based on frozen decision-time evidence.
9. Policy simulation does not mutate policy until explicit activation.
10. Federation routes to a cooperative, not to a globally ranked worker.
11. AI is advisory / language assistance only and does not dispatch, set pay, penalize, decide replay, vote or activate policy.

## Still to wire from the full web implementation
- Server-backed OTP issuance/verification with expiry and attempt limits.
- Durable state adapter (Supabase or another backend) instead of in-memory prototype state.
- Full frozen Decision Receipt payload and deterministic Replay Court execution.
- Real proof/image upload storage.
- Real customer payment provider.
- Real routing / live GPS provider semantics beyond the illustrative service map.
- Complete multilingual copy tables for English / Hindi / Marathi.
- Full federation receipt + worker receipt persistence/replay.

These gaps are deliberately not presented as already-productionized features.

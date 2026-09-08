# KaamSabha Mobile Master Prompt

Read `aadi-harale/kaamsabha2` completely before changing the mobile app. The web application is the product/domain source of truth, not a UI template.

Build the official KaamSabha mobile application with Expo, React Native, TypeScript and Expo Router. The customer experience should feel like a premium Urban Company/UrbanClap-style consumer services app. The worker experience should be task-first and livelihood-first. The admin experience should feel like a compact operations console.

## Non-negotiable UX

Do not build a hackathon dashboard, generic AI UI, random card wall or compressed desktop page. Use deep cooperative green, warm off-white, white surfaces, strong typography, restrained borders/shadows, 16-24px radii, large touch targets and clear native navigation. Do not show W01/W02, raw JSON, machine metadata or technical governance jargon to normal users.

Use real worker names from the source repo such as Ravi Shinde, Meena Jadhav, Anil Kulkarni, Asha Kamble, Sagar Pawar, Nikita More, Priya Gaikwad, Imran Shaikh, Kavita Bhosale and Manoj Patil.

## Customer

Bottom tabs: Home, Bookings, Help, Profile.

Implement service discovery for Electrical, Cleaning, Appliance Repair, Plumbing and Carpentry; stepwise booking; active booking; named worker; route/map; scope; protected amount; job timeline; Scope Lock; Start OTP; proof; Completion OTP; demo checkout; feedback; guided help that creates admin-visible cases.

## Worker

Bottom tabs: Today, Earnings, Fair Work, Voice, Profile.

Today must prioritize the current task and next safe action. Support accept, safe decline, travel, arrive, scope check, added-scope proposal, Start OTP verification, work proof and Completion OTP verification. Earnings must show meaningful seeded history and protected payouts. Fair Work must explain eligibility in plain language and provide Replay Court. Voice must separate today's problem, a past decision challenge and a future rule suggestion.

## Admin

Bottom tabs: Operations, Cases, Federation, Governance, More.

Operations shows active work/capacity. Cases is one human-readable inbox for customer support, worker issues, ratings, Replay Court and policy suggestions. Governance includes Policy Signal Monitor, Protection Validator, Counterfactual Policy Twin, personal impact, one-member-one-vote, quorum and guarded activation. Federation must be an operational workflow with map, requests, capacity and receipts.

## Critical invariants

1. Protected payout floor cannot be undercut.
2. No reverse bidding or paid ranking.
3. Safe decline has zero opportunity/rating penalty.
4. Start and Completion OTPs are distinct, job-specific, expiring, attempt-limited and single-use in the production implementation.
5. Pending Scope Lock blocks Start OTP.
6. Scope change invalidates any old Start OTP.
7. Completion OTP requires proof.
8. Low ratings never auto-deactivate.
9. Decision Receipts freeze decision-time facts and policy version.
10. Replay Court replays frozen evidence, never today's database.
11. AI may assist intake, support language and pattern detection only. It may not dispatch, set pay, penalize, deactivate, decide replay, vote or activate policy.
12. Policy simulation is non-mutating until deliberate activation.
13. Protection Validator blocks harmful proposals even if votes support them.
14. New policy applies to future jobs only; past receipts remain frozen.
15. Federation selects an eligible cooperative first; the receiving cooperative's own constitution selects its worker second. Never globally rank federation workers.

## Memorable product principles

- The complexity stays inside the system, not on the worker's screen.
- Fairness is enforced before ranking begins.
- We replay the decision, not today's database.
- SAME JOBS / SAME WORKERS / DIFFERENT RULES.
- The federation moves the job, not the worker.
- The federation chooses the cooperative. The cooperative chooses the worker.
- AI assists language. Deterministic rules govern livelihoods.

## Required demo story

Customer books Electrical -> named worker assigned -> worker accepts -> travels -> arrives -> proposes extra scope -> customer approves -> fresh Start OTP -> worker starts -> proof -> customer Completion OTP -> worker completes -> demo payment -> worker earnings -> Replay Court -> policy suggestion -> admin cases -> Policy Twin -> voting simulation -> guarded policy activation -> federation shortage -> select receiving cooperative -> cooperative selects its worker -> receipts.

Everything must share one consistent domain state. Clearly label demo-only integrations and approximate routing. Never claim production infrastructure that is not actually connected.

Before calling the app finished: run TypeScript, lint, Expo Doctor, Android/Expo Go smoke test, check no overflow, no raw IDs/JSON, verify the full cross-role lifecycle, then publish an EAS Update or development build only after Expo authentication succeeds.

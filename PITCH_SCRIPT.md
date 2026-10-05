# KaamSabha — Slides 3 and 4

Timed for speaking pace. Stage directions in brackets. Every number here is checked against the
code; the "where it comes from" table at the end says which file proves each one.

---

## Slide 3 — Solution and key features (95 sec, ~235 words)

> **"KaamSabha changes one thing: who owns the rulebook.**
> For the customer, the same marketplace. For the worker, a different engine underneath.
> Here is one month for Ramesh, an electrician."

**Week 1 — a job goes to someone else.** *[point: Decision Receipt]*
> "On most platforms, no reason is given. Here: *Leela went ahead of you — she had 150 minutes
> booked that day, you had 300.*
> Still not satisfied? Replay Court re-runs that exact decision on the numbers frozen that day.
> Not today's numbers. **That day's.**"

**Week 3 — one bad rating.** *[point: Rating Firewall]*
> "Where dispatch ranks by rating, a score dip can quietly cut your work off.
> Here, a one-star opens a **human review**. His access does not change. And the Worker
> Protection Floor means his pay cannot be cut while that review happens."

**Week 4 — an extra socket.** *[point: Scope Lock]*
> "Sunita wants one more switch. Normally that is argued at the door, with the worker holding
> the weaker end.
> Here Ramesh sends it for approval and **cannot start** until she agrees. It protects both of
> them — she is never surprised by the bill."

**Month end — a voice.** *[point: Constitution]*
> "Commission is usually set by the company. Here, members vote the rules — one member, one
> vote. And the Policy Twin tests a rule *before* the vote: a paid-priority rule is **blocked by
> code**, not by goodwill."

**Any busy week.** *[point: Federation]*
> "No electrician free? Federation hands the job to a neighbouring cooperative, which picks its
> own worker. We never reach across and pick theirs."

**Punchline.** *[pause]*
> **"Ramesh isn't asking for charity. He's asking: explain it, and let me have a say."**

---

## Slide 4 — Technology and innovation (55 sec, ~150 words)

*[point: Innovation Gap / USP]*
> "Any platform can copy a feature. But all six of our USPs need the workers to own the
> rulebook — and ownership is not a feature you ship."

*[point: Deterministic Engine]*
> "Why can we promise replay? The dispatch engine is pure functions — same inputs, same
> decision, every time. Each decision is frozen into a receipt. OTPs are signed, HMAC-SHA256."

*[point: the comparison panel — this is the money shot]*
> "Same 32 jobs. Same 13 members. One thing changed: the rule.
> **Ours: ten members earn.** Rating-ranked: five.
> **Ours never hands new work to someone already at their daily limit. The other rule does it
> eleven times.**
> Across twelve overflow scenarios, local-only served **zero**. Federation served **eleven**,
> with zero protection violations."

> "**120 automated tests.** Worker screens in English, Hindi and Marathi."

*[honest line — say it confidently, it is a strength]*
> "One thing straight: today the rules run in the browser. We chose a demo that always works
> over a half-built backend. The engine is pure functions, so moving it behind Supabase
> row-level security is a port, not a rewrite."

> "Over to **[C]** for the live demo."

---

## Three fixes from your draft, and why

**1. "81 automated tests" → 120.** The suite has grown. Under-claiming is still a wrong number
if a judge counts.

**2. "nobody got work beyond their daily limit" → "nobody is handed new work once they are
already at their daily limit."**

This matters. The guard stops a member being *given* new work at their limit; it does not yank
someone off a job already underway. The panel marks a member who finished slightly over with a
**†** and explains it — in our own column. If you claim the stronger version and a judge opens
that panel, they find the dagger and you lose the room. The precise version is the one that is
0 against 11, and it is the stronger claim anyway: *the other rule did it eleven times.*

**3. Naming Urban Company — reconsider.**

Three reasons to attack the **rule** instead of the company:

- *You cannot prove it on stage.* "IDs blocked below 4.7 to 4.8" is a specific factual claim
  about a named firm. If one judge has read differently, the rest of your numbers get doubted
  too.
- *The app contradicts you.* The comparison panel says in writing: **"This is a counterfactual,
  not an accusation… not a claim about how any particular company allocates work."** A test
  fails the build if a brand name appears there. If you name a company on stage and the screen
  says you are not, a sharp judge will notice.
- *The rule is the bigger target.* "Rating-ranked dispatch" is not one company — it is the
  default across the industry. Attacking a rule makes the point universal and unanswerable.

Suggested wording where you had the company:

| Instead of | Say |
| --- | --- |
| "On Urban Company, workers report no reason" | "On rating-ranked platforms, no reason is given" |
| "IDs blocked below about 4.7 to 4.8" | "Where dispatch ranks by rating, a score dip can quietly cut your work off" |
| "commission slabs set by the company" | "Commission is usually set by the company, not the workers" |

If you are asked directly — *"Are you saying Urban Company does this?"* — the strong answer is:
> "We make no claim about any company. We compare against a rule, stated in full on screen, and
> you can judge the rule yourself. Our point is that the rule is a **choice**, and who owns the
> rulebook decides it."

That answer is better than the attack would have been.

---

## Likely questions, and the honest answers

**"Is this real or mocked?"**
> "The dispatch engine, the receipts, the OTP signing and the federation routing are real code
> with 120 tests. Payments are a clearly-labelled demo sheet. The register is in the browser
> today. We have written down exactly what is real and what is not — it is in
> PRODUCTION_READINESS.md in the repo."

**"Why should I believe the comparison is fair?"**
> *[open "How is this calculated?"]* "Deterministic seed, the register's own members and
> ratings, identical on every machine, read-only. Both rules check certification first — only
> what happens *after* that differs. And it shows our own rule's edge case rather than hiding
> it."

**"Your rule left a job unfilled — isn't that worse for the customer?"**
> "Yes, and we show that on purpose. Our rule refuses rather than overworking someone. That is
> exactly what Federation is for: a neighbouring cooperative with safe capacity takes it. Zero
> served locally, eleven served through federation."

**"What stops a cooperative from voting away the protections?"**
> "Code does. A paid-priority rule, a reverse auction, or a cut to the payout floor is rejected
> by the Protection Validator before it can ever reach a ballot. There is a test for it."

**"AI in the loop?"**
> "AI only organises complaints and drafts discussion language. It cannot pick a worker,
> set pay, penalise anyone, decide a Replay Court case, or activate a policy. That boundary is
> enforced in code, not in a policy document."

---

## Where each number comes from

| Claim | Proof |
| --- | --- |
| 32 jobs, 13 members, 10 earn vs 5 | `lib/rule-comparison.ts`, seed 26089 |
| 0 vs 11 handed work past their limit | `jobsPastSafeLimit`, `tests/rule-comparison.test.ts` |
| 12 scenarios, 0 served local-only, 11 via federation, 0 violations | `simulateFederationTwin()`, `tests/domain.test.ts` |
| Paid priority / reverse auction / floor cut blocked | `validatePolicyChange()`, `tests/domain.test.ts` |
| 120 automated tests | `npm test` |
| English, Hindi, Marathi | `lib/messages.ts`, `tests/i18n.test.ts` |
| HMAC-SHA256 OTP | `lib/otp.ts` |

Re-run `npm test` the morning of the pitch and use the number it prints.

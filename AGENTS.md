# KAAMSABHA design and build standards

This application is a cooperative work-allocation register and governance runtime, not a landing page. Judges need the ownership-versus-control idea in 15 seconds; workers need dignity and understandable livelihood decisions; customers need reliable service.

## Required process
Plan → review against brief → build → screenshot → critique → fix → verify.

## Product principles
- Customer is service-first; worker is task-first; operations is record-first; governance is consequence-first.
- The one bold visual is SAME JOBS / SAME WORKERS / DIFFERENT RULE. Everything else stays quiet.
- Use work tickets, schedules, policy clauses, receipts and member ballots as structural language.
- Preserve hard skill, activity, availability, schedule, radius, SLA, emergency and workload constraints before livelihood preference.
- Freeze decision inputs and policy versions. Never retroactively rewrite settled jobs or receipts.
- Simulation precedes voting; one member/one vote; quorum and approval precede activation.
- Clearly label synthetic data and mock payments. AI may assist intake only; it never selects workers, calculates pay, penalizes workers, decides replay or activates policy.

## Quality floor
- 320, 768, 1024 and 1440px without horizontal page scrolling.
- Worker/customer mobile-first; governance and operations usable on mobile.
- Keyboard controls, visible focus, semantic HTML, accessible dialogs, no color-only meaning, reduced-motion support.
- No gradients, glass, fake maps, decorative dashboards, tracked uppercase filler or duplicated navigation.

## Engineering invariants
Use deterministic seed 26089. Start and completion OTPs are job-specific, distinct, expiring, attempt-limited and single-use. Refusal has zero opportunity/rating penalty. Protected payout and worker safeguards cannot be undercut by federation routing. Federation chooses an eligible cooperative first; the receiving cooperative's constitution chooses the worker.

## Durable context
Read `AGENT_STATE.md` before edits. Search before reading. Preserve working code. Run tests, typecheck, lint/build where available and never claim a check passed without evidence.

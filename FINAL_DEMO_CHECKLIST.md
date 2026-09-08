# KaamSabha final SIH demo checklist

Use the same browser/profile so the persisted demo register is shared across roles.

1. Customer (`customer01`) → Home → choose a service → add problem note/reference filename → confirm booking.
2. Worker (assigned worker ID shown on the order) → Current Job → accept → start travel → mark arrived.
3. Customer → Orders → issue start OTP.
4. Worker → verify start OTP → add work proof → optionally request a Scope Lock change.
5. Customer → approve/decline change → review proof → issue completion OTP.
6. Worker → verify completion OTP.
7. Customer → settle invoice → submit feedback, or demonstrate protected cancellation before work starts.
8. Worker → Fair Work → inspect Decision Receipt → open Replay Court challenge.
9. Worker → Governance → cast one-member/one-vote ballot.
10. Admin → Operations / Workers / Cases / Money / Governance / Demand / Federation → show the shared records and safeguards.

Provider truthfulness: route/ETA displayed in-app are demo estimates. The Open live directions action hands off to Google Maps using the actual service locality. AI remains intake-only; the deterministic demo stores structured customer intake without claiming a live external model when no provider key is configured.

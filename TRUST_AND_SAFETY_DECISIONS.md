# Which judge suggestions strengthen KaamSabha?

The best additions protect an actual work ticket: one current assignment, informed prices, customer-approved changes, inspectable proof, safe exit and a human answer. They support worker ownership rather than turning AI into an unaccountable supervisor.

| Suggestion | Decision and implementation | Why / remaining boundary |
|---|---|---|
| Exclusive job assignment | Added emergency release → customer consent → deterministic replacement. Original receipt, proof and opportunity remain; only the current member can advance the job. | Protects continuity and prevents two live replacement offers for one job in the device-local command flow. Concurrent production clients still require server transactions. |
| Family emergency, accident or unsafe site | Member can stop an accepted job, describe remaining work and pause availability without a rating/opportunity penalty. Started work requires a separate recorded cooperative pay review. | Keeps workers safe without pretending their earlier labour disappears. Review notes do not themselves pay compensation; live funding/accounting remains required. |
| Expenses before booking / working | Customer quote and worker breakdown show agreed member pay, ₹0 current commission and ₹0 unapproved extras. Later policies cannot inflate old goodwill, scope, cancellation or settlement amounts. | Makes the same amount carry through both roles. Production taxes, material reimbursements and gateway charges are not integrated. |
| Before/after photo and video proof | Real JPG/PNG/WebP/MP4/WebM files up to 2 MB persist behind MediaRepository in IndexedDB. Explanation, parts justification and result checks accompany the file and SHA-256 fingerprint. Replacement requires its own after-work proof and fresh codes. | Supports inspectable evidence. A hash shows byte identity, not truth; text-only/legacy labels are explicitly identified. Device files do not sync to another phone. |
| AI verifies requested work | Optional multimodal OpenRouter endpoint compares approved scope and explanations with saved media. Explicit consent is required. Missing provider/model is “not reviewed”, never a fabricated verdict. | Useful questions and observations; no certification of hidden repairs, automatic fraud accusation, penalty, pay decision or ban. Configure OPENROUTER_PROOF_MODEL with supported image/video inputs and test it. |
| Changed diagnosis and unnecessary parts | Existing Scope Lock now works before and during work. The customer approves the description and price; proof records why a part was needed. AI sees approved changes only. | Enforces consent. Universal repair procedures and safety advice need qualified trade-specific validation; not invented by a generic model. |
| Unauthorized helpers / unlisted charges | Quote says no automatic helper charge. Both roles can file job- and receipt-linked concerns for unapproved helpers or unlisted charges. | Named helper onboarding/scheduling is deferred. Extra people are not implicitly authorized by accepting the original worker or uploading proof. |
| Useful support / damage disputes | Both roles have Safety & help with actual saved cases, receipt linkage, cooperative replies and reviewed closure. Proof is inspectable in operations. | Human accountability replaces an instant “resolved” label. Service guarantees, insurance and enforceable refunds require operational/legal arrangements. |
| SOS | `tel:112` opens the dialer; the screen explicitly explains that no police alert/location is sent automatically. | Honest emergency access. Direct authority integration and an staffed external safety response are not claimed. India's emergency service is [112](https://112.gov.in/about). |
| Job notification | Saved offer banner, acknowledgement and opt-in browser system alert. | Works while the app is open on a supported secure browser. Background push, phone calls, SMS and WhatsApp require delivery providers and consent. |
| Payments and worker transfers | Razorpay test preparation: operator-approved frozen server invoice, durable local repository, order, HMAC, exact captured payment, idempotent ledger/webhook and separate Route transfer/reconciliation. | Test credentials, Route accounts and real provider checkout remain configuration/verification prerequisites; see PAYMENT_SETUP.md. No real money or bank settlement is claimed. |
| Worker verification / duplicate accounts | Keep the current seeded verified-member register and no public signup. Defer real identity verification and duplicate detection to provider-backed onboarding. | Browser flags/shared passwords are not KYC. Production needs server identity, unique verified-identity binding, privacy, consent and an appeal/recovery path. |
| Customer identity verification | Defer to real identity/payment-provider integration. | Do not collect ID scans into an editable local demo or claim a card proves the person at the address. |
| AI/web material price comparison | Defer automated “scam” verdicts. Use documented, customer-approved scope costs and parts explanations now. | Prices depend on exact part, tax, seller, delivery and condition. A web listing is context, not proof of fraud; a future comparison must show matching SKU/source/date and allow human explanation. |
| AI dispute decisions using GPS/chat/photos | Use optional evidence questions and existing frozen-input Replay Court for allocation. Defer autonomous blame/refund decisions and fabricated GPS evidence. | Current map positions are illustrative. Location duration alone cannot prove work quality; human review and original evidence must remain available. |
| Customer red flags / shadowban | Both sides can report safety/payment behaviour for cooperative review. Reject secret bans from ratings or AI. | Evidence, a stated reason, human decision and appeal protect workers while preventing a new opaque platform power. |

No cloud infrastructure, heavy dependency, identity scan or fake provider transition was added. The cooperative dispatch comparison and member ballots stay central; proof/support detail folds into the work ticket.

Video input wiring follows [OpenRouter’s documented video-understanding format](https://openrouter.ai/docs/guides/overview/multimodal/videos). A compatible model is required; provider capability is not inferred from a model name.

## Verified continuous walkthrough

Run against the local production build on 6 October 2026 in an isolated browser profile. No test records were written into the user's profile.

| Step | Actual outcome |
|---|---|
| New booking | KMS-00002, Plumbing, Leela Waghmare (W13), ₹760, original receipt KMS-00002-receipt. |
| Emergency during started work | Leela's offer released; zero live offers; availability paused; two proof records and original receipt preserved; zero rating/opportunity penalty. |
| Customer consent | Same job assigned to Farhan Qureshi (W12), one live offer, new receipt DEC-00020, ₹760. |
| Member decision | Ravi's ninth Yes vote enabled admin activation of constitution-v3/₹860; the earlier agreed job remained ₹760. |
| Replacement work | Fresh start/finish codes and Farhan's own after-work proof; three records total. Actual AI route returned unavailable rather than claiming a review. |
| Human support | ISS-00017 and ISS-00041 received saved cooperative replies and closed. Interrupted-work compensation remains a separate welfare decision; the review did not transfer funds. |
| Local demo settlement | INV-KMS-00002, ₹760 member/₹0 commission. Farhan's sample-plus-demo total rose from ₹7,800 to ₹8,560, nine paid jobs. |
| Later booking | KMS-00064 used v3/₹860 for W12. The original receipt remained byte-for-byte equal. |
| Refresh and reconciliation | Two bookings, one completion, two of thirteen members offered work, ₹760 job payout and one active booking. These counters came from the actions above, excluding sample history and synthetic comparison demand. Actual WebM playback plus two images survived refresh. |

The separate normal judge regression also passed: ₹190 accepted-job cancellation protection, ₹760 completed service, confirmed/closed Replay Court challenge, a carpentry shortage with no receiver at 25 minutes then a successful 35-minute Yerawada/Nikita transfer with both receipts, and v3/₹860 on a later booking. Its final counters were five bookings, one completion, three members offered work and ₹760 job payout.

Razorpay screens were exercised separately with an explicitly controlled API/checkout adapter: approved scope plus ₹180 addition froze a ₹940 invoice; signed capture imported once; Route creation/reconciliation displayed pending bank settlement and reported provider fee/tax. This is UI/service verification, **not an actual Razorpay provider checkout or transfer**. Credentials are still unconfigured locally. The setup and operational boundaries are in [PAYMENT_SETUP.md](PAYMENT_SETUP.md).

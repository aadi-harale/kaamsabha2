# Razorpay test mode

This pass prepares real Razorpay API wiring. It does not claim a successful provider checkout without merchant test credentials. The offline presentation can still use the clearly labelled local demo checkout.

## Local configuration

Repository: `C:\Users\AADI\Downloads\kaamsabha2-worker-simple`.
Copy only missing variables from `.env.example` into the existing `.env.local`; preserve existing secrets. Never commit `.env.local` or paste keys into a support chat.

```dotenv
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_secret
RAZORPAY_WEBHOOK_SECRET=your_separate_webhook_secret
PAYMENT_OPERATOR_TOKEN=your_random_secret_of_at_least_32_characters
RAZORPAY_LINKED_ACCOUNTS={"W02":"acc_your_test_linked_account"}
```

Use Node 22.13+ (verified here on Node 24.16). Restart the local server after changing environment variables:

```powershell
cd C:\Users\AADI\Downloads\kaamsabha2-worker-simple
npm install
npm run build
npm run start -- -H 0.0.0.0 -p 3012
```

Open `http://localhost:3012`. `/api/payments` reports configuration readiness without exposing secret values. Live keys are rejected. Test mode moves no real money.

## Actual flow

1. Customer books; member accepts, arrives, confirms the start code, saves proof and confirms the finish code.
2. Admin opens **Payments**. If work was interrupted, first record its separate pay review under **Jobs & decisions**.
3. Enter the server payment-operator token on the Payments screen. It remains only in screen memory.
4. Review the completed job, agreed amount and frozen member receipt. Approve the server test invoice. The invoice fixes its scope, member, total, protection floor and zero commission.
5. Customer opens **Orders → Open Razorpay test checkout**. The server creates an order for its approved amount, in paise; the browser cannot supply a checkout amount.
6. The server verifies the checkout signature with its stored order ID, then fetches the payment and requires `captured`, matching order, INR and the exact invoice amount. Only then is one test settlement imported into the local register.
7. Admin reads the server payment record and, with Razorpay Route enabled and that worker's linked account configured, requests a separate test transfer. Duplicate requests are blocked. Reconcile the transfer reference against the provider before recording `processed`. Neither `created` nor `processed` is proof of bank settlement. Reconciliation also records the provider settlement state, reversals and reported fees/tax; unknown values remain unverified.
8. If checkout closes before reconciliation, **Check payment status** recovers a webhook-confirmed capture. An authorized but uncaptured payment does not post earnings; enable automatic capture in the Razorpay test dashboard or capture there, then reconcile.

## Webhook and persistence

Configure test `payment.captured` events to `https://your-reachable-test-server/api/payments/webhook`. Razorpay cannot reach `localhost`; use an approved HTTPS tunnel to this same local server for provider testing. Sign with `RAZORPAY_WEBHOOK_SECRET`, separate from the API key secret.

The endpoint verifies HMAC-SHA256 over the original body, resolves the stored order, rechecks the provider payment and records a unique payment/event transaction. Callback/webhook duplicates cannot credit the ledger twice.

Server records are in ignored `.local-data/payments.sqlite` with a WAL journal. Back up the entire directory while the service is stopped; do not commit or delete it to reset the browser. Browser register resets do not reset approved server invoices. An old job ID with changed facts is refused. For a new presentation register, use a separate payment workspace/server database after reconciling any test orders; never silently overwrite an invoice.

An uncertain network result stops automatic retries. Admin reconciles the provider's matching `order_…` or `trf_…` reference; the system does not create another possible payment/transfer. A crash leaving an order `ordering` also requires reconciliation. Failed transfers require operator/provider review, not an automatic resend.

## Boundaries

- The operator approval is an explicit bridge from the editable device-local demo to a server-owned test invoice. Public demo logins are not real financial authentication.
- Local SQLite is deliberately disabled on Vercel. A durable hosted PaymentRepository, server-owned job register, real authentication/authorization, provider onboarding, refunds/disputes and settlement reconciliation are prerequisites for live deployment.
- The constitution currently has zero platform commission. The ledger records zero; no fee is quietly imposed on protected member pay. Gateway fees/taxes and interrupted-member compensation need explicit accounting before live use.
- Route requires provider enablement and verified linked accounts. IDs alone do not establish KYC or bank ownership.
- No real checkout, video-model response or transfer should be claimed until its configured provider test is actually run.

Implementation follows [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [raw-body webhook validation](https://razorpay.com/docs/webhooks/validate-test/) and the separate [Razorpay Route transfer API](https://razorpay.com/docs/api/payments/route/create-transfers-payments).

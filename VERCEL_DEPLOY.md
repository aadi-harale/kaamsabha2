# Vercel deployment — kaamsabha2

This repository is native Next.js and has no Cloudflare/Vinext/Wrangler runtime dependency.

## One-time setup
1. Import **aadi-harale/kaamsabha2** into Vercel. Do not import the reference repository `aadi-harale/KaamSabha`.
2. Framework preset: **Next.js**. Root directory: repository root. Build command: `npm run build` (or Vercel default). Node.js: 22.x.
3. Add `KAAMSABHA_OTP_SECRET` as a server-only secret. Use a long random value. Never prefix it with `NEXT_PUBLIC_`.
4. For the SIH self-contained demo, set `KAAMSABHA_DEMO_MODE=true`. In a real deployment, omit/disable it and deliver OTP out-of-band.
5. Optional Supabase variables are listed in `.env.example`. The current deterministic demo repository remains explicit when Supabase is not configured.

## Required smoke test after linking
- `GET /api/health` returns healthy JSON.
- Customer `customer01` books Electrical. Receipt shows `coop-kharadi -> W02` and payout >= ₹760.
- Logout; worker `W02` accepts -> travels -> arrives.
- Customer issues start OTP; worker verifies; worker adds proof and optionally requests a change; customer approves/declines.
- Customer issues completion OTP after proof; worker verifies; customer settles and submits feedback.
- Admin sees the same job, receipt, issue/challenge and settlement records.
- Fair Work shows the frozen receipt/replay route; Federation shows cooperative-first, worker-second routing.
- Governance Policy Twin remains simulation-only and does not mutate the active constitution.

Do not call the deployment production-ready until the Vercel build and smoke flow above are actually verified on the production URL.

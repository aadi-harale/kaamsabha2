# Vercel deployment

KaamSabha2 is native Next.js and intentionally contains no Wrangler, Cloudflare Worker, Vinext or Vite runtime dependency.

## One-time setup
1. Import `aadi-harale/kaamsabha2` in Vercel.
2. Framework preset: **Next.js**. Root directory: repository root.
3. Install command: `npm install`. Build command: `npm run build`. Output is managed by Next.js/Vercel; do not set a custom output directory.
4. Set only the environment variables needed for the selected data mode. Copy variable names from `.env.example`; keep all values in Vercel Project Settings. Never expose service-role, OpenRouter or OTP secrets with a `NEXT_PUBLIC_` prefix.
5. Deploy and smoke-test `/` and `/api/health`.

## Data modes
`KAAMSABHA_DATA_MODE=demo` uses the deterministic device-local repository for the SIH walkthrough. A connected Supabase repository is not yet implemented in this target and must not be claimed as verified until later integration work is complete.

## Security boundary
Browser state contains synthetic demo records only. Real authentication, OTP verification, evidence storage and privileged database writes must terminate on server routes/repositories using server-only secrets. `.env.example` contains placeholders only.

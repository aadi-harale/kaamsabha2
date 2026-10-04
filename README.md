# KaamSabha2

Active SIH26089 implementation: a cooperative household/community services platform where workers collectively own the marketplace rules that decide access to work.

This repository is the writable implementation workspace. `aadi-harale/KaamSabha` is reference-only.

## Demo credentials

The web app now uses account-based demo authentication with RBAC.

- Customer: `customer` / `12345`
- Worker: `ravi` / `12345` (or any seeded worker's first name in lowercase)
- Cooperative admin: `admin` / `12345`

The role is derived from the account rather than selected after login. Critical domain commands also enforce role checks. This remains demo authentication; production requires server-side identity, hashed credentials, secure sessions and backend authorization.

## Product coverage
- Native Next.js 16 / React 19 runtime for Vercel.
- Customer / worker / admin session isolation over one deterministic shared register.
- Five service categories: electrical, cleaning, appliance repair, plumbing and carpentry.
- In-browser Leaflet/OpenStreetMap service maps with OSRM road routing and accessible deterministic fallbacks.
- Worker Issues, Replay Court challenges, safe zero-penalty declines, workability limits, policy Suggestions, personal policy-impact review and one-member/one-vote governance.
- Worker Protection Floor, Cooperative Dispatch Constitution, Policy Twin, Decision Receipts, Scope Lock, cancellation protection, Rating Firewall, Workload Safety Guard and Federation Mesh.
- Optional OpenRouter intake assistance and optional Supabase state mirror; both fail safely to the local-first judge demo.

Run locally with `npm install && npm run dev`. Verification is `npm run verify`.

See `AGENTS.md`, `AGENT_STATE.md`, `FINAL_DEMO_CHECKLIST.md`, and `VERCEL_DEPLOY.md` before modifying the application.

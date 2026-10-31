# Cost & Dependency Register

Policy: recurring cost target is **$0/month**. Any change that adds a service,
a paid plan, an API key or usage-based billing must update this file and get
explicit approval from the owner before it is merged. No payment method is to
be added to any provider without approval.

_Last reviewed: 2026-10-31_

## Services

| Service | Plan | Monthly cost | Billing risk | Limits to watch | Owner action needed |
|---------|------|--------------|--------------|-----------------|---------------------|
| Supabase | Free | $0 | None (no card on file) | 500 MB DB, 1 GB storage, 5 GB egress; pauses after ~7 days idle | Keep-alive secrets in GitHub; monthly export |
| Vercel | Hobby | $0 | None (Hobby has no overages; usage past limits pauses the project) | Non-commercial use only; ~100 GB transfer; 1M invocations | None |
| GitHub | Free (private repo) | $0 | None without a card | 2,000 Actions min/month (keep-alive uses ~10) | Add `SUPABASE_URL`, `SUPABASE_ANON_KEY` secrets |
| AI | Manual provider (your existing subscription) | $0 added | None | — | Approve before any API provider is added |

## npm dependencies (all open source, $0)

| Package | Purpose | License |
|---------|---------|---------|
| next | App framework | MIT |
| react, react-dom | UI | MIT |
| @supabase/supabase-js, @supabase/ssr | Database + auth client | MIT |
| server-only | Prevents server modules leaking to the browser | MIT |
| tailwindcss, @tailwindcss/postcss | Styling (dev) | MIT |
| typescript, @types/* | Type checking (dev) | Apache-2.0 / MIT |

## Proposed — not approved, not active

| Item | Est. cost | Benefit |
|------|-----------|---------|
| Claude API provider for briefings | Usage-based, likely < $1/month for weekly briefings | Narrative analysis without copy/paste |
| Supabase Pro | ~$25/month | No pausing, PITR backups |
| Custom domain | ~$10–15/year | Nicer URL (`*.vercel.app` is free) |

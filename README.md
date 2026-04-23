# Statosphere

Personal growth, structured by people who know you.

## Stack
- Next.js 15 (App Router)
- Supabase (Auth, DB, Storage)
- Resend (Email)
- Tailwind CSS

## Setup

1. Clone the repo
2. Copy `.env.local.example` to `.env.local` and fill in your credentials
3. Run the SQL from `/supabase/schema.sql` in your Supabase SQL editor
4. `npm install && npm run dev`

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL` | Your production URL (no trailing slash) |
| `RESEND_API_KEY` | Resend API key for email |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
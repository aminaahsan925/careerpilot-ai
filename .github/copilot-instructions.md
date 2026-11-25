# Copilot instructions for CareerPilot AI

## Stack (from this repo)
- TanStack Start + TanStack Router, React 19, TypeScript, Vite, Nitro
- Supabase Auth, Postgres, Storage, Row Level Security
- AI via Groq, Gemini, or OpenRouter; Tavily for live web research
- Tailwind CSS, Radix UI, TanStack Query, Motion
- Node.js 20+, npm; dev server via `npm run dev`
- Deployed on Vercel; all services on free tiers — never add a paid service or API

## Project layout
- `src/components/` — reusable UI and product sections
- `src/data/` — client queries, mutations, domain types
- `src/integrations/supabase/` — browser/server clients, generated DB types
- `src/lib/` — server functions and domain logic
- `src/routes/` — TanStack Start routes
- `supabase/migrations/` — versioned DB schema and RLS policies
- Server-only modules use `.server.ts` — keep privileged credentials there, never in browser code

## Rules
- TypeScript strict: type everything, no `any` unless unavoidable
- Match the existing style in each file; make the smallest change that works
- Verify with `npx tsc --noEmit` and `npm run build` after changes
- Never invent API keys or secrets; never commit `.env` — only `.env.example` placeholders
- Only the publishable Supabase key belongs in client code; service-role, AI and Tavily keys stay server-side
- Never change pricing, plans, or payment flows without being asked
- CareerPilot never invents evidence: show the student’s real proof and gaps honestly

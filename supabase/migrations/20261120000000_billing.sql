-- Billing — Safepay activation records, subscriptions, and AI quotas.
--
-- This is the migration the billing code already expects:
-- - safepay.server.ts activateFromTracker() upserts into `payments`
--   (order_id, user_id, tracker, amount, currency, status) and then
--   into `user_subscriptions` (user_id, plan, status). Before this
--   migration neither table existed, so a real Rs 499 checkout ended in
--   "Could not record the payment" with no plan and no payment record.
-- - billing.server.ts getUserPlan() reads `user_subscriptions`
--   (plan, status) for active rows, and consumeAiCall() calls the
--   `consume_ai_quota` RPC below. Before this migration the RPC did
--   not exist, so every quota check errored.
--
-- Security posture: RLS is enabled on all four tables. Authenticated
-- users may only SELECT their own rows. There are deliberately NO
-- INSERT / UPDATE / DELETE policies for client roles, and no write
-- grants to `authenticated` — only the service role (server-side
-- activation) and the SECURITY DEFINER quota RPC may write.
-- Safe to re-run: every statement is idempotent.

-- ============================================================================
-- 1. payments — one row per Safepay checkout, keyed by our order id.
--    order_id is the primary key so the activation upsert (which passes
--    no onConflict target) is idempotent on re-delivery / re-check.
-- ============================================================================

create table if not exists public.payments (
  order_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  tracker text not null unique,
  amount integer not null check (amount > 0),
  currency text not null,
  status text not null check (status in ('paid', 'pending', 'refunded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx
  on public.payments (user_id);

grant select on public.payments to authenticated;
grant all on public.payments to service_role;

alter table public.payments enable row level security;

drop policy if exists "Users can view their own payments" on public.payments;
create policy "Users can view their own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- ============================================================================
-- 2. user_subscriptions — one row per user; the plan of record.
--    user_id is the primary key so the activation upsert (which passes
--    no onConflict target) flips a user to proof idempotently.
-- ============================================================================

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('free', 'proof')),
  status text not null check (status in ('active', 'cancelled', 'expired', 'past_due')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.user_subscriptions to authenticated;
grant all on public.user_subscriptions to service_role;

alter table public.user_subscriptions enable row level security;

drop policy if exists "Users can view their own subscription" on public.user_subscriptions;
create policy "Users can view their own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

-- ============================================================================
-- 3. ai_usage — daily per-user AI call counters.
-- ============================================================================

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  calls integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

grant select on public.ai_usage to authenticated;
grant all on public.ai_usage to service_role;

alter table public.ai_usage enable row level security;

drop policy if exists "Users can view their own AI usage" on public.ai_usage;
create policy "Users can view their own AI usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

-- ============================================================================
-- 4. ai_call_logs — per-call audit log (which endpoint spent the call).
-- ============================================================================

create table if not exists public.ai_call_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_call_logs_user_created_idx
  on public.ai_call_logs (user_id, created_at desc);

grant select on public.ai_call_logs to authenticated;
grant all on public.ai_call_logs to service_role;

alter table public.ai_call_logs enable row level security;

drop policy if exists "Users can view their own AI call logs" on public.ai_call_logs;
create policy "Users can view their own AI call logs"
  on public.ai_call_logs for select
  using (auth.uid() = user_id);

-- ============================================================================
-- 5. consume_ai_quota — atomic check-and-consume. Called once per AI call,
--    BEFORE the call is made, so concurrent requests can't race past the
--    limit. Returns { allowed, calls, limit } as jsonb, matching what
--    billing.server.ts consumeAiCall() reads.
-- ============================================================================

create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_daily_limit integer,
  p_endpoint text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calls integer;
begin
  -- Caller isolation: an authenticated caller may only consume their own
  -- quota. service_role (server-side flows) may pass any user id.
  if auth.uid() is distinct from p_user_id and auth.role() <> 'service_role' then
    raise exception 'consume_ai_quota: caller may only consume their own quota';
  end if;

  insert into public.ai_usage (user_id, day, calls)
  values (p_user_id, current_date, 1)
  on conflict (user_id, day)
  do update set calls = ai_usage.calls + 1, updated_at = now()
  returning ai_usage.calls into v_calls;

  insert into public.ai_call_logs (user_id, endpoint)
  values (p_user_id, p_endpoint);

  return jsonb_build_object(
    'allowed', v_calls <= p_daily_limit,
    'calls', v_calls,
    'limit', p_daily_limit
  );
end;
$$;

revoke all on function public.consume_ai_quota(uuid, integer, text) from public, anon;
grant execute on function public.consume_ai_quota(uuid, integer, text)
  to authenticated, service_role;

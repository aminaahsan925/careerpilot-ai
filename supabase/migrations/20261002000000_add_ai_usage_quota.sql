-- Phase 1: AI cost control — per-user daily quotas + usage logging.
--
-- Run this in the Supabase SQL editor (as the project owner) BEFORE deploying
-- the Phase 1 code. Safe to re-run: every statement is idempotent.

-- 1. Daily per-user AI call counters ---------------------------------------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  calls integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- 2. Per-call audit log (which endpoint spent the call) ----------------------
create table if not exists public.ai_call_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_call_logs_user_created_idx
  on public.ai_call_logs (user_id, created_at desc);

-- 3. Row-level security: users may read their own rows; only the RPC below
--    (security definer) and the service role may write.
alter table public.ai_usage enable row level security;
alter table public.ai_call_logs enable row level security;

drop policy if exists "Users can view their own AI usage" on public.ai_usage;
create policy "Users can view their own AI usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own AI call logs" on public.ai_call_logs;
create policy "Users can view their own AI call logs"
  on public.ai_call_logs for select
  using (auth.uid() = user_id);

-- 4. Atomic check-and-consume. Called once per AI call, BEFORE the call is
--    made, so concurrent requests can't race past the limit.
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
  -- quota. service_role (server-side jobs) may pass any user id.
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

/**
 * Billing migration contract test.
 *
 * Regression test for the worst defect found in the 2026-11-20 inspection:
 * Safepay activation wrote to `payments` / `user_subscriptions` tables that
 * had no migration, so a real Rs 499 checkout charged the user and activated
 * nothing. This test pins the static contract between the billing code and
 * the migration: the tables, columns, RPC, and RLS posture the code
 * expects must exist in `supabase/migrations/20261120000000_billing.sql`.
 *
 * NOTE: there is no Postgres or Supabase access in this environment, so a
 * live end-to-end activation run (apply migration → insert payment →
 * activate → read subscription) cannot run here. That run must happen
 * against the real project before Safepay keys are configured. What this
 * test guarantees is that the migration file exists and contains every
 * object the code depends on, so the "table does not exist" failure mode
 * cannot come back silently.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const MIGRATION = resolve(
  repoRoot,
  "supabase/migrations/20261120000000_billing.sql",
);

function readMigration(): string {
  expect(
    existsSync(MIGRATION),
    "billing migration 20261120000000_billing.sql must exist",
  ).toBe(true);
  return readFileSync(MIGRATION, "utf-8");
}

function tableBlock(sql: string, table: string): string {
  const match = sql.match(
    new RegExp(`create table if not exists public\\.${table} \\(([\\s\\S]*?)\\);`, "i"),
  );
  expect(match, `migration must create table public.${table}`).not.toBeNull();
  const body = match?.[1];
  expect(body, `migration must define columns for public.${table}`).toBeDefined();
  return body as string;
}

describe("billing migration exists", () => {
  it("the migration file is present and idempotent", () => {
    const sql = readMigration();
    expect(sql.length).toBeGreaterThan(0);
    // Every statement must be safe to re-run.
    expect(sql).toMatch(/create table if not exists public\.payments/i);
    expect(sql).toMatch(/create table if not exists public\.user_subscriptions/i);
    expect(sql).toMatch(/create table if not exists public\.ai_usage/i);
    expect(sql).toMatch(/create table if not exists public\.ai_call_logs/i);
    expect(sql).toMatch(/create or replace function public\.consume_ai_quota/i);
  });
});

describe("activation tables match the code's upserts", () => {
  it("payments has every column activateFromTracker upserts", () => {
    const sql = readMigration();
    const payments = tableBlock(sql, "payments");
    // safepay.server.ts activateFromTracker upserts:
    // { order_id, user_id, tracker, amount, currency, status: "paid" }
    for (const col of ["order_id", "user_id", "tracker", "amount", "currency", "status"]) {
      expect(payments).toMatch(new RegExp(`\\b${col}\\b`, "i"));
    }
    // The upsert passes no onConflict target, so order_id must be the PK.
    expect(payments).toMatch(/order_id text primary key/i);
    // "paid" must be a valid status value.
    expect(payments).toMatch(/'paid'/);
    // amount must accept the Rs 499 plan price (49,900 paisa > 0).
    expect(payments).toMatch(/amount integer not null check \(amount > 0\)/i);
  });

  it("user_subscriptions has every column activation upserts", () => {
    const sql = readMigration();
    const subs = tableBlock(sql, "user_subscriptions");
    // activateFromTracker upserts { user_id, plan: "proof", status: "active" }
    for (const col of ["user_id", "plan", "status"]) {
      expect(subs).toMatch(new RegExp(`\\b${col}\\b`, "i"));
    }
    expect(subs).toMatch(/user_id uuid primary key/i);
    expect(subs).toMatch(/'proof'/);
    expect(subs).toMatch(/'active'/);
  });

  it("getUserPlan's plan/status select is satisfiable", () => {
    const sql = readMigration();
    const subs = tableBlock(sql, "user_subscriptions");
    expect(subs).toMatch(/\bplan\b/i);
    expect(subs).toMatch(/\bstatus\b/i);
  });
});

describe("consume_ai_quota RPC matches its callers", () => {
  it("function exists with the signature both quota helpers call", () => {
    const sql = readMigration();
    expect(sql).toMatch(
      /create or replace function public\.consume_ai_quota\(\s*p_user_id uuid,\s*p_daily_limit integer,\s*p_endpoint text\s*\)/i,
    );
    expect(sql).toMatch(/returns jsonb/i);
    expect(sql).toMatch(/security definer/i);
    // The verdict object both callers read: { allowed, calls, limit }.
    expect(sql).toMatch(/'allowed'/);
    expect(sql).toMatch(/'calls'/);
    expect(sql).toMatch(/'limit'/);
  });

  it("billing.server.ts and ai-quota.server.ts pass the same arg names", () => {
    const billing = readFileSync(resolve(here, "billing.server.ts"), "utf-8");
    const quota = readFileSync(resolve(here, "ai-quota.server.ts"), "utf-8");
    for (const [name, src] of [
      ["billing.server.ts", billing],
      ["ai-quota.server.ts", quota],
    ] as const) {
      expect(src, `${name} must call the consume_ai_quota RPC`).toContain(
        '"consume_ai_quota"',
      );
      for (const arg of ["p_user_id", "p_daily_limit", "p_endpoint"]) {
        expect(src, `${name} must pass ${arg}`).toContain(arg);
      }
    }
  });

  it("ai_usage and ai_call_logs back the RPC", () => {
    const sql = readMigration();
    const usage = tableBlock(sql, "ai_usage");
    expect(usage).toMatch(/primary key \(user_id, day\)/i);
    expect(usage).toMatch(/\bcalls\b/i);
    const logs = tableBlock(sql, "ai_call_logs");
    expect(logs).toMatch(/\bendpoint\b/i);
  });
});

describe("billing RLS posture", () => {
  const tables = ["payments", "user_subscriptions", "ai_usage", "ai_call_logs"] as const;

  it("RLS is enabled on all four tables", () => {
    const sql = readMigration();
    for (const table of tables) {
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      );
    }
  });

  it("clients get SELECT only — no client write policies or grants", () => {
    const sql = readMigration();
    // No INSERT / UPDATE / DELETE policy may exist for any billing table.
    expect(sql).not.toMatch(/create policy[^;]*for (insert|update|delete)/i);
    // Authenticated role gets SELECT only; service_role gets ALL.
    for (const table of tables) {
      expect(sql).toMatch(
        new RegExp(`grant select on public\\.${table} to authenticated`, "i"),
      );
      expect(sql).toMatch(
        new RegExp(`grant all on public\\.${table} to service_role`, "i"),
      );
    }
  });

  it("the RPC is executable by authenticated + service_role only", () => {
    const sql = readMigration();
    expect(sql).toMatch(
      /revoke all on function public\.consume_ai_quota\(uuid, integer, text\) from public, anon/i,
    );
    expect(sql).toMatch(
      /grant execute on function public\.consume_ai_quota\(uuid, integer, text\)\s*to authenticated, service_role/i,
    );
  });
});

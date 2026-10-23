import { createFileRoute, isRedirect, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const AUTH_CHECK_TTL_MS = 30_000;
const AUTH_REQUEST_TIMEOUT_MS = 4_000;

type AuthGateResult = {
  user: { id: string };
  onboarded: boolean;
  phase1Done: boolean;
};

let authGateCache: { userId: string; checkedAt: number; result: AuthGateResult } | null = null;
let authGatePromise: Promise<AuthGateResult> | null = null;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    Promise.resolve(promise).then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        globalThis.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function readAuthGate(): Promise<AuthGateResult> {
  if (authGateCache && Date.now() - authGateCache.checkedAt < AUTH_CHECK_TTL_MS) {
    return authGateCache.result;
  }
  if (authGatePromise) return authGatePromise;

  authGatePromise = (async () => {
    // Read the persisted session locally first. This prevents every sidebar
    // click from waiting on a network auth request.
    const sessionResult = await withTimeout(
      supabase.auth.getSession(),
      AUTH_REQUEST_TIMEOUT_MS,
      "Session check",
    );
    let user = sessionResult.data.session?.user ?? null;

    // If storage has no session, perform one authoritative check before
    // redirecting so expired or rotated sessions remain correct.
    if (!user) {
      const userResult = await withTimeout(
        supabase.auth.getUser(),
        AUTH_REQUEST_TIMEOUT_MS,
        "Authentication check",
      );
      user = userResult.data.user;
    }
    if (!user) throw redirect({ to: "/auth", search: { redirect: "/", reset: undefined } });

    let onboarded = false;
    let phase1Done = false;
    try {
      const profileResult = await withTimeout(
        supabase
          .from("profiles")
          .select("onboarding_completed, current_status")
          .eq("user_id", user.id)
          .maybeSingle(),
        AUTH_REQUEST_TIMEOUT_MS,
        "Profile check",
      );
      onboarded = profileResult.data?.onboarding_completed === true;
      phase1Done = profileResult.data?.current_status != null;

      // Support databases where current_status has not been migrated yet.
      if (profileResult.error) {
        const basicResult = await withTimeout(
          supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("user_id", user.id)
            .maybeSingle(),
          AUTH_REQUEST_TIMEOUT_MS,
          "Basic profile check",
        );
        onboarded = basicResult.data?.onboarding_completed === true;
        phase1Done = true;
      }
    } catch (profileError) {
      // A slow profile read must not freeze navigation. The destination page
      // can still render and show its own query error or retry state.
      console.warn("[CareerPilot] Profile guard unavailable; allowing navigation:", profileError);
      onboarded = true;
      phase1Done = true;
    }

    const result = { user, onboarded, phase1Done };
    authGateCache = { userId: user.id, checkedAt: Date.now(), result };
    return result;
  })();

  try {
    return await authGatePromise;
  } finally {
    authGatePromise = null;
  }
}

void supabase.auth.onAuthStateChange(() => {
  authGateCache = null;
});

export const Route = createFileRoute("/_authenticated")({
  // Sessions live in localStorage, which the server cannot read.
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      const { user, onboarded, phase1Done } = await readAuthGate();
      const onOnboarding = location.pathname.startsWith("/onboarding");

      if ((!onboarded || !phase1Done) && !onOnboarding) {
        throw redirect({ to: "/onboarding" });
      }

      return { user };
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error("[CareerPilot] Auth check failed, redirecting to /auth:", err);
      throw redirect({ to: "/auth", search: { redirect: location.pathname, reset: undefined } });
    }
  },
  component: AuthenticatedLayout,
  pendingComponent: AuthPending,
});

function AuthenticatedLayout() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let currentUserId: string | null = null;
    let initialized = false;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user.id ?? null;
      const changedAccount = initialized && currentUserId !== nextUserId;
      initialized = true;
      currentUserId = nextUserId;

      if (event === "SIGNED_OUT" || changedAccount) {
        authGateCache = null;
        void queryClient
          .cancelQueries()
          .catch(() => undefined)
          .finally(() => queryClient.clear());
      }
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return <Outlet />;
}

function AuthPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-terracotta border-t-transparent" />
        Checking your session...
      </div>
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Fetch (or generate) the global tech trends report.
 *  Returns cached data when available. */
export const getTechTrendsReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    console.info("[CareerPilot][getTechTrendsReport] start", { userId: context.userId });
    const { getTechTrends } = await import("./tech-trends.server");
    try {
      const result = await getTechTrends(context.supabase, context.userId);
      console.info("[CareerPilot][getTechTrendsReport] success", {
        userId: context.userId,
        fromCache: result.fromCache,
        featured: result.featured.name,
      });
      return result;
    } catch (error) {
      console.error("[CareerPilot][getTechTrendsReport] failed", {
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

/** Force-regenerate the tech trends report, bypassing cache. */
export const getTechTrendsFresh = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    console.info("[CareerPilot][getTechTrendsFresh] start", { userId: context.userId });
    const { getTechTrends } = await import("./tech-trends.server");
    try {
      const result = await getTechTrends(context.supabase, context.userId, { forceRefresh: true });
      console.info("[CareerPilot][getTechTrendsFresh] success", {
        userId: context.userId,
        featured: result.featured.name,
      });
      return result;
    } catch (error) {
      console.error("[CareerPilot][getTechTrendsFresh] failed", {
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

/** Get detailed information about a specific technology. */
export const getTechTrendDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { technologyName: string }) => {
    const name = String(input?.technologyName ?? "").trim();
    if (!name) throw new Error("Please specify a technology name.");
    if (name.length > 120) throw new Error("Technology name is too long.");
    return { technologyName: name };
  })
  .handler(async ({ data, context }) => {
    console.info("[CareerPilot][getTechTrendDetail] start", {
      userId: context.userId,
      technology: data.technologyName,
    });
    const { getTechTrendDetail: getDetail } = await import("./tech-trends.server");
    try {
      const result = await getDetail(context.supabase, context.userId, data.technologyName);
      console.info("[CareerPilot][getTechTrendDetail] success", {
        userId: context.userId,
        technology: data.technologyName,
      });
      return result;
    } catch (error) {
      console.error("[CareerPilot][getTechTrendDetail] failed", {
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

/** Update a user's technology learning tracking status. */
export const updateTechTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { technologyName: string; status: string }) => {
    const name = String(input?.technologyName ?? "").trim();
    const status = String(input?.status ?? "want_to_learn").trim();
    if (!name) throw new Error("Please specify a technology name.");
    const validStatuses = ["want_to_learn", "learning", "built_project", "completed"];
    if (!validStatuses.includes(status)) throw new Error("Invalid tracking status.");
    return { technologyName: name, status };
  })
  .handler(async ({ data, context }) => {
    console.info("[CareerPilot][updateTechTracking]", {
      userId: context.userId,
      technology: data.technologyName,
      status: data.status,
    });
    const { error } = await context.supabase
      .from("user_tech_tracking")
      .upsert(
        {
          user_id: context.userId,
          technology_name: data.technologyName,
          status: data.status,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "user_id,technology_name" },
      );
    if (error) {
      console.error("[CareerPilot][updateTechTracking] DB error:", error.message);
      throw error;
    }
    return { ok: true };
  });

/** Get the user's technology tracking data. */
export const getTechTracking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_tech_tracking")
      .select("technology_name, status, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[CareerPilot][getTechTracking] DB error:", error.message);
      throw error;
    }
    return data ?? [];
  });

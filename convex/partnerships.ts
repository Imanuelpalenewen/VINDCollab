/**
 * convex/partnerships.ts
 *
 * Add this query (getMyPartnerships) to your existing partnerships.ts file,
 * or replace the file entirely if you don't have one yet.
 *
 * If you already have a partnerships.ts, just copy the getMyPartnerships
 * export and paste it at the bottom.
 */

import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Returns all partnerships involving the current org,
 * enriched with event + partner/host org details + task stats.
 *
 * Used by the Partner Management screen.
 */
export const getMyPartnerships = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user?.orgId) return [];

    const orgId = user.orgId;

    // ── 1. Partnerships where we are the PARTNER org ──────────────────────
    const asPartner = await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerOrgId", orgId))
      .collect();

    // ── 2. Events we HOST → then their partnerships ───────────────────────
    const hostedEvents = await ctx.db
      .query("events")
      .withIndex("by_host", (q) => q.eq("hostOrgId", orgId))
      .collect();

    const asHost: (typeof asPartner[number])[] = [];
    for (const event of hostedEvents) {
      const ps = await ctx.db
        .query("partnerships")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      // Exclude self-partnerships and ones already in asPartner
      for (const p of ps) {
        if (p.partnerOrgId !== orgId) asHost.push(p);
      }
    }

    // Merge + deduplicate by _id
    const seen = new Set<string>();
    const all: (typeof asPartner[number])[] = [];
    for (const p of [...asPartner, ...asHost]) {
      if (!seen.has(p._id)) {
        seen.add(p._id);
        all.push(p);
      }
    }

    // ── 3. Enrich with event + org details + task stats ───────────────────
    const enriched = await Promise.all(
      all.map(async (p) => {
        const event = await ctx.db.get(p.eventId);
        const partnerOrg = await ctx.db.get(p.partnerOrgId);
        const hostOrg = await ctx.db.get(p.hostOrgId);

        // Task stats for the partner org in this event
        const allTasks = await ctx.db
          .query("tasks")
          .withIndex("by_event", (q) => q.eq("eventId", p.eventId))
          .filter((q) => q.eq(q.field("assignedOrgId"), p.partnerOrgId))
          .collect();

        const doneTasks = allTasks.filter((t) => t.status === "DONE");
        const avgHours =
          doneTasks.length > 0
            ? doneTasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0) /
              doneTasks.length
            : 0;

        // Simple score: completion % weighted by priority
        const completionRate =
          allTasks.length > 0 ? (doneTasks.length / allTasks.length) * 100 : 0;
        const highDone = doneTasks.filter((t) => t.priority === "HIGH").length;
        const highTotal = allTasks.filter((t) => t.priority === "HIGH").length;
        const priorityBonus = highTotal > 0 ? (highDone / highTotal) * 20 : 0;
        const score = Math.round(Math.min(100, completionRate * 0.8 + priorityBonus));

        return {
          ...p,
          event,
          partnerOrg,
          hostOrg,
          isHost: p.hostOrgId === orgId,
          taskStats: {
            total: allTasks.length,
            done: doneTasks.length,
            avgHours: Math.round(avgHours * 10) / 10,
            score,
          },
        };
      })
    );

    // Sort: ACCEPTED first, then by event start date descending
    enriched.sort((a, b) => {
      if (a.status === "ACCEPTED" && b.status !== "ACCEPTED") return -1;
      if (b.status === "ACCEPTED" && a.status !== "ACCEPTED") return 1;
      return (b.event?.startDate ?? 0) - (a.event?.startDate ?? 0);
    });

    return enriched;
  },
});
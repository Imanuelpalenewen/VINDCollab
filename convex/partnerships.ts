import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Get all partnerships for an event, enriched with partner org details
 */
export const getByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Enrich with partner org details
    return await Promise.all(
      partnerships.map(async (p) => {
        const partnerOrg = await ctx.db.get(p.partnerOrgId);
        const hostOrg = await ctx.db.get(p.hostOrgId);
        return {
          ...p,
          partnerOrg: partnerOrg ? {
            _id: partnerOrg._id,
            name: partnerOrg.name,
            category: partnerOrg.category,
            capabilities: partnerOrg.capabilities,
          } : null,
          hostOrg: hostOrg ? {
            _id: hostOrg._id,
            name: hostOrg.name,
          } : null,
        };
      })
    );
  },
});

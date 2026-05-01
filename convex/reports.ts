import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getEventsForReport = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user?.orgId) return [];

    // Events hosted by my org
    const hostedEvents = await ctx.db
      .query("events")
      .withIndex("by_host", (q) => q.eq("hostOrgId", user.orgId!))
      .collect();

    // Events where I am an accepted partner
    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerOrgId", user.orgId!))
      .collect();

    const acceptedPartnerships = partnerships.filter(
      (p) => p.status === "ACCEPTED"
    );

    const partnerEvents = (
      await Promise.all(acceptedPartnerships.map((p) => ctx.db.get(p.eventId)))
    ).filter(Boolean) as NonNullable<
      Awaited<ReturnType<typeof ctx.db.get<"events">>>
    >[];

    // Deduplicate
    const allEvents = [...hostedEvents, ...partnerEvents];
    const seen = new Set<string>();
    const uniqueEvents = allEvents.filter((e) => {
      if (!e || seen.has(e._id)) return false;
      seen.add(e._id);
      return true;
    });

    // Annotate each event with whether a post-event report exists
    const result = await Promise.all(
      uniqueEvents.map(async (event) => {
        const report = await ctx.db
          .query("postEventReports")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .first();

        return {
          _id: event._id,
          title: event.title,
          eventType: event.eventType,
          status: event.status,
          startDate: event.startDate,
          endDate: event.endDate,
          hostOrgId: event.hostOrgId,
          isHost: event.hostOrgId === user.orgId,
          hasReport: report !== null,
        };
      })
    );

    // Sort: events with reports first, then by most recent
    return result.sort((a, b) => {
      if (a.hasReport !== b.hasReport) return a.hasReport ? -1 : 1;
      return b.startDate - a.startDate;
    });
  },
});

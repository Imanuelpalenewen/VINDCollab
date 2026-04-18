import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertOrgMembership(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user?.orgId) throw new Error("No organization found");
  return { userId, user, orgId: user.orgId };
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * All events owned by my organization, newest first.
 */
export const listMyEvents = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.orgId) return [];

    return await ctx.db
      .query("events")
      .withIndex("by_host", (q) => q.eq("hostOrgId", user.orgId!))
      .order("desc")
      .collect();
  },
});

/**
 * OPEN events from OTHER organizations — for the Discover section.
 */
export const listOpenEvents = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);

    const events = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "OPEN"))
      .order("desc")
      .collect();

    // Exclude my org's own events
    const filtered = events.filter((e) => e.hostOrgId !== user?.orgId);

    // Enrich with host org name
    return await Promise.all(
      filtered.map(async (e) => {
        const org = await ctx.db.get(e.hostOrgId);
        return { ...e, hostOrgName: org?.name ?? "Unknown" };
      })
    );
  },
});

/**
 * Single event by ID, enriched with host org info and partnership counts.
 */
export const getById = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) return null;

    const hostOrg = await ctx.db.get(event.hostOrgId);

    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_event", (q) => q.eq("eventId", args.id))
      .collect();

    const acceptedCount = partnerships.filter((p) => p.status === "ACCEPTED").length;
    const pendingCount = partnerships.filter((p) => p.status === "PENDING").length;

    return {
      ...event,
      hostOrg: {
        _id: hostOrg?._id,
        name: hostOrg?.name ?? "Unknown",
        category: hostOrg?.category ?? "",
        logoUrl: hostOrg?.logoUrl,
      },
      acceptedPartners: acceptedCount,
      pendingInvites: pendingCount,
    };
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Create a new event. Pass status: "OPEN" to publish immediately,
 * or omit (defaults to "DRAFT") to save as draft.
 */
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    eventType: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    requirements: v.array(v.string()),
    partnerCriteria: v.array(v.string()),
    status: v.optional(v.union(v.literal("DRAFT"), v.literal("OPEN"))),
  },
  handler: async (ctx, args) => {
    const { orgId } = await assertOrgMembership(ctx);

    if (args.endDate < args.startDate) {
      throw new Error("End date must be on or after start date.");
    }

    return await ctx.db.insert("events", {
      hostOrgId: orgId,
      title: args.title.trim(),
      description: args.description.trim(),
      eventType: args.eventType,
      status: args.status ?? "DRAFT",
      startDate: args.startDate,
      endDate: args.endDate,
      requirements: args.requirements,
      partnerCriteria: args.partnerCriteria,
    });
  },
});

/**
 * Publish a DRAFT event → OPEN so other orgs can discover it.
 */
export const publishEvent = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const { orgId } = await assertOrgMembership(ctx);
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");
    if (event.hostOrgId !== orgId) throw new Error("Not authorized");
    if (event.status !== "DRAFT") throw new Error("Only DRAFT events can be published");

    await ctx.db.patch(args.id, { status: "OPEN" });
  },
});

/**
 * Update an existing DRAFT event's details.
 */
export const updateEvent = mutation({
  args: {
    id: v.id("events"),
    title: v.string(),
    description: v.string(),
    eventType: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    requirements: v.array(v.string()),
    partnerCriteria: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await assertOrgMembership(ctx);
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");
    if (event.hostOrgId !== orgId) throw new Error("Not authorized");
    if (event.status !== "DRAFT") throw new Error("Only DRAFT events can be edited");

    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      description: args.description.trim(),
      eventType: args.eventType,
      startDate: args.startDate,
      endDate: args.endDate,
      requirements: args.requirements,
      partnerCriteria: args.partnerCriteria,
    });
  },
});

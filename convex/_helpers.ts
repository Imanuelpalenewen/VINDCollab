import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

/**
 * Asserts the caller is authenticated and belongs to an organization.
 * Returns { userId, user, orgId }.
 * Shared by: events, invitations, chat
 */
export async function assertOrgMembership(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user?.orgId) throw new Error("No organization found");
  return { userId, user, orgId: user.orgId };
}

/**
 * Asserts the caller is authenticated, belongs to an organization,
 * and is the host of the given event.
 * Returns { userId, orgId, event }.
 * Shared by: tasks
 */
export async function assertEventHost(ctx: any, eventId: Id<"events">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user?.orgId) throw new Error("No organization found");

  const event = await ctx.db.get(eventId);
  if (!event) throw new Error("Event not found");
  if (event.hostOrgId !== user.orgId) {
    throw new Error("Only event host can manage tasks");
  }

  return { userId, orgId: user.orgId, event };
}

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Generates a random 6-char alphanumeric invite code */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Creates a new organization and links the current user to it.
 * Returns the new org's ID and invite code.
 */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    capabilities: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const inviteCode = generateInviteCode();

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      category: args.category,
      capabilities: args.capabilities,
      isVerified: false,
      inviteCode,
    });

    // Link this user to the new organization
    await ctx.db.patch(userId, { orgId });

    return { orgId, inviteCode };
  },
});

/**
 * Joins an existing organization via a 6-char invite code.
 * Patches the current user's orgId.
 */
export const joinByInviteCode = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const code = args.inviteCode.trim().toUpperCase();
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .unique();

    if (!org) throw new Error("Invalid invite code. Please check and try again.");

    await ctx.db.patch(userId, { orgId: org._id });
    return { orgId: org._id };
  },
});

/**
 * Returns the organization linked to the current user.
 * Returns null if user has no org.
 */
export const getMyOrg = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user?.orgId) return null;

    return await ctx.db.get(user.orgId);
  },
});

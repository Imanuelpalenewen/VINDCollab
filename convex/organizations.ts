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
      inviteCodeCreatedAt: Date.now(),
    });

    await ctx.db.patch(userId, { orgId });
    return { orgId, inviteCode };
  },
});

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

    if (org.inviteCodeCreatedAt) {
      const INVITE_VALIDITY_MS = 15 * 60 * 1000; // 15 minutes
      if (Date.now() - org.inviteCodeCreatedAt > INVITE_VALIDITY_MS) {
        throw new Error("This invite code has expired. Please ask the organization for a new code.");
      }
    }

    await ctx.db.patch(userId, { orgId: org._id });
    return { orgId: org._id };
  },
});

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

export const updateOrg = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    capabilities: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.orgId) throw new Error("Organization not found");

    await ctx.db.patch(user.orgId, {
      name: args.name.trim(),
      category: args.category,
      capabilities: args.capabilities,
    });
  },
});

/**
 * Replaces the current invite code with a fresh 6-char code.
 * Resets the 15-minute expiry timer.
 */
export const generateNewInviteCode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.orgId) throw new Error("Organization not found");

    const newCode = generateInviteCode();
    await ctx.db.patch(user.orgId, {
      inviteCode: newCode,
      inviteCodeCreatedAt: Date.now(), // Reset 15-minute expiry
    });
    return newCode;
  },
});

export const getOrgStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { eventCount: 0, partnerCount: 0 };

    const user = await ctx.db.get(userId);
    if (!user?.orgId) return { eventCount: 0, partnerCount: 0 };

    const orgId = user.orgId;

    const events = await ctx.db
      .query("events")
      .withIndex("by_host", (q) => q.eq("hostOrgId", orgId))
      .collect();

    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerOrgId", orgId))
      .filter((q) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();

    return {
      eventCount: events.length,
      partnerCount: partnerships.length,
    };
  },
});

/**
 * Generates a Convex Storage upload URL.
 * Client uses this URL to POST an image file, then calls updateOrgLogo
 * with the returned storageId.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Saves the Convex Storage file URL as the org's logo.
 * Called after the image has been successfully uploaded.
 */
export const updateOrgLogo = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.orgId) throw new Error("Organization not found");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = await ctx.storage.getUrl(args.storageId as any);
    if (!url) throw new Error("Could not retrieve file URL");

    await ctx.db.patch(user.orgId, { logoUrl: url });
    return url;
  },
});

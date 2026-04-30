import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";
import { assertOrgMembership } from "./_helpers";

// Queries
/**
 * Get all invitations for the current org (incoming + outgoing)
 * Paginated with optional status filter
 */
export const getMyInvitations = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(v.union(
      v.literal("PENDING"),
      v.literal("ACCEPTED"),
      v.literal("DECLINED"),
      v.literal("NEGOTIATING"),
      v.literal("EXPIRED")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: null };
    const user = await ctx.db.get(userId);
    if (!user?.orgId) return { page: [], isDone: true, continueCursor: null };

    let query = ctx.db.query("invitations");

    // Get invitations where this org is sender OR recipient
    const query1 = ctx.db
      .query("invitations")
      .withIndex("by_sender", (q) => q.eq("senderOrgId", user.orgId!));

    const query2 = ctx.db
      .query("invitations")
      .withIndex("by_recipient", (q) => q.eq("recipientOrgId", user.orgId!));

    // Get all and merge
    const sent = await query1.collect();
    const received = await query2.collect();
    const all = [...sent, ...received];

    // Filter by status if provided
    let filtered = all;
    if (args.status) {
      filtered = all.filter((inv) => inv.status === args.status);
    }

    // Sort by creation time descending
    filtered.sort((a, b) => b._creationTime - a._creationTime);

    // Manual pagination (since we merged two queries)
    const numItems = args.paginationOpts.numItems;
    const cursor = args.paginationOpts.cursor ? parseInt(args.paginationOpts.cursor) : 0;

    const page = filtered.slice(cursor, cursor + numItems);
    const isDone = cursor + numItems >= filtered.length;
    const nextCursor = isDone ? null : (cursor + numItems).toString();

    return {
      page,
      isDone,
      continueCursor: nextCursor,
    };
  },
});

/**
 * Get full details of a single invitation with event and org info
 */
export const getInvitationDetail = query({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) return null;

    const event = await ctx.db.get(invitation.eventId);
    const senderOrg = await ctx.db.get(invitation.senderOrgId);
    const recipientOrg = await ctx.db.get(invitation.recipientOrgId);

    return {
      ...invitation,
      event,
      senderOrg,
      recipientOrg,
    };
  },
});

/**
 * Get negotiation history for an invitation (all rounds)
 */
export const getNegotiationHistory = query({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("negotiationHistory")
      .withIndex("by_invitation", (q) => q.eq("invitationId", args.invitationId))
      .order("asc")
      .collect();

    // Enrich each entry with org names so the UI never shows raw IDs
    return await Promise.all(
      history.map(async (entry) => {
        const proposedByOrg = await ctx.db.get(entry.proposedBy);
        const respondedByOrg = entry.respondedBy
          ? await ctx.db.get(entry.respondedBy)
          : null;
        return {
          ...entry,
          proposedByName: proposedByOrg?.name ?? entry.proposedBy,
          respondedByName: respondedByOrg?.name ?? (entry.respondedBy ?? null),
        };
      })
    );
  },
});

// Mutations
/**
 * Send an invitation to a partner organization
 */
export const sendInvitation = mutation({
  args: {
    eventId: v.id("events"),
    recipientOrgId: v.id("organizations"),
    proposedRole: v.string(),
    resourceContribution: v.optional(v.string()),
    revenueSharing: v.optional(v.object({
      percentage: v.number(),
      method: v.string(),
    })),
    responseDeadline: v.number(),
    personalMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await assertOrgMembership(ctx);

    // Validate sender is event host
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.hostOrgId !== orgId) throw new Error("Only event host can send invitations");

    // Validate recipient exists
    const recipientOrg = await ctx.db.get(args.recipientOrgId);
    if (!recipientOrg) throw new Error("Recipient organization not found");

    // Validate recipient is not the sender
    if (args.recipientOrgId === orgId) throw new Error("Cannot send invitation to yourself");

    // Check if invitation already exists
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const alreadyInvited = existing.some(
      (inv) =>
        inv.recipientOrgId === args.recipientOrgId &&
        (inv.status === "PENDING" || inv.status === "NEGOTIATING" || inv.status === "ACCEPTED")
    );

    if (alreadyInvited) throw new Error("This organization already has a pending or accepted invitation");

    // Validate personal message length
    if (args.personalMessage && args.personalMessage.length > 300) {
      throw new Error("Personal message must be 300 characters or less");
    }

    // Create invitation
    const invitationId = await ctx.db.insert("invitations", {
      eventId: args.eventId,
      senderOrgId: orgId,
      recipientOrgId: args.recipientOrgId,
      status: "PENDING",
      proposedRole: args.proposedRole.trim(),
      resourceContribution: args.resourceContribution ? args.resourceContribution.trim() : undefined,
      revenueSharing: args.revenueSharing,
      responseDeadline: args.responseDeadline,
      personalMessage: args.personalMessage ? args.personalMessage.trim() : undefined,
      declineReason: undefined,
      negotiationRounds: 1,
      // Track that sender proposed first → recipient must respond
      lastProposedBy: orgId,
    });

    // Create initial negotiation history entry
    await ctx.db.insert("negotiationHistory", {
      invitationId,
      round: 1,
      proposedBy: orgId,
      proposedRole: args.proposedRole.trim(),
      resourceContribution: args.resourceContribution ? args.resourceContribution.trim() : undefined,
      revenueSharing: args.revenueSharing,
      notes: args.personalMessage ? args.personalMessage.trim() : undefined,
      respondedBy: undefined,
      response: undefined,
    });

    return invitationId;
  },
});

/**
 * Respond to an invitation (accept or decline)
 */
export const respondToInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    response: v.union(v.literal("ACCEPTED"), v.literal("DECLINED")),
    declineReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await assertOrgMembership(ctx);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new Error("Invitation not found");

    // Verify caller is part of this invitation
    const isParty =
      invitation.senderOrgId === orgId || invitation.recipientOrgId === orgId;
    if (!isParty) throw new Error("You are not part of this invitation");

    // ─── Turn validation ────────────────────────────────────────────────────
    // If lastProposedBy is set, the OTHER party must respond.
    // If it's undefined (legacy records), fall back to history query.
    if (invitation.lastProposedBy) {
      if (orgId === invitation.lastProposedBy) {
        throw new Error("Waiting for the other party to respond");
      }
    } else {
      // Legacy fallback: query history to determine turn
      const history = await ctx.db
        .query("negotiationHistory")
        .withIndex("by_invitation", (q) => q.eq("invitationId", args.invitationId))
        .order("desc")
        .first();
      if (history) {
        if (orgId === history.proposedBy) {
          throw new Error("Waiting for the other party to respond");
        }
      } else {
        if (orgId !== invitation.recipientOrgId) {
          throw new Error("Only the invitation recipient can respond");
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // Verify status allows response
    if (invitation.status !== "PENDING" && invitation.status !== "NEGOTIATING") {
      throw new Error(`Cannot respond to ${invitation.status} invitation`);
    }

    if (args.response === "DECLINED") {
      if (!args.declineReason) throw new Error("Decline reason is required");
      if (args.declineReason.trim().length === 0) throw new Error("Decline reason cannot be empty");

      // Update invitation with decline
      await ctx.db.patch(args.invitationId, {
        status: "DECLINED",
        declineReason: args.declineReason.trim(),
      });

      // Record decline in history
      // proposedBy = orgId (whoever is declining this round)
      await ctx.db.insert("negotiationHistory", {
        invitationId: args.invitationId,
        round: invitation.negotiationRounds + 1,
        proposedBy: orgId,
        proposedRole: invitation.proposedRole,
        resourceContribution: invitation.resourceContribution,
        revenueSharing: invitation.revenueSharing,
        notes: args.declineReason.trim(),
        respondedBy: orgId,
        response: "DECLINED",
      });

      return null;
    }

    // ACCEPTED response
    // Create partnership record
    const partnership = await ctx.db.insert("partnerships", {
      eventId: invitation.eventId,
      hostOrgId: invitation.senderOrgId,
      partnerOrgId: invitation.recipientOrgId,
      status: "ACCEPTED",
      role: invitation.proposedRole,
      terms: JSON.stringify({
        resourceContribution: invitation.resourceContribution,
        revenueSharing: invitation.revenueSharing,
      }),
    });

    // Update invitation status
    await ctx.db.patch(args.invitationId, {
      status: "ACCEPTED",
    });

    // Record acceptance in history
    // proposedBy = orgId (whoever is accepting this round)
    await ctx.db.insert("negotiationHistory", {
      invitationId: args.invitationId,
      round: invitation.negotiationRounds + 1,
      proposedBy: orgId,
      proposedRole: invitation.proposedRole,
      resourceContribution: invitation.resourceContribution,
      revenueSharing: invitation.revenueSharing,
      notes: "Invitation accepted",
      respondedBy: orgId,
      response: "ACCEPTED",
    });

    console.log(`[respondToInvitation] Invitation ${args.invitationId} ACCEPTED by ${orgId}. Preparing to auto-create chat rooms for event ${invitation.eventId}.`);

    // Auto-create #general and #announcements chat rooms for the event if they don't exist
    const existingRooms = await ctx.db
      .query("chatRooms")
      .withIndex("by_event", (q) => q.eq("eventId", invitation.eventId))
      .collect();

    const hasGeneral = existingRooms.some(r => r.type === "EVENT" && r.name === "#general");
    const hasAnnouncements = existingRooms.some(r => r.type === "ANNOUNCEMENT" && r.name === "#announcements");

    if (!hasGeneral) {
      await ctx.db.insert("chatRooms", {
        eventId: invitation.eventId,
        name: "#general",
        type: "EVENT",
        createdBy: userId,
      });
    }

    if (!hasAnnouncements) {
      await ctx.db.insert("chatRooms", {
        eventId: invitation.eventId,
        name: "#announcements",
        type: "ANNOUNCEMENT",
        createdBy: userId,
      });
    }

    // Trigger AI Task Breakdown generation
    await ctx.scheduler.runAfter(0, internal.ai.taskBreakdown.generateTaskBreakdown, {
      eventId: invitation.eventId,
    });

    return partnership;
  },
});

/**
 * Make a counter-proposal to an invitation
 */
export const counterPropose = mutation({
  args: {
    invitationId: v.id("invitations"),
    proposedRole: v.string(),
    resourceContribution: v.optional(v.string()),
    revenueSharing: v.optional(v.object({
      percentage: v.number(),
      method: v.string(),
    })),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await assertOrgMembership(ctx);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new Error("Invitation not found");

    // Verify responder is either sender or recipient
    const isParty = invitation.senderOrgId === orgId || invitation.recipientOrgId === orgId;
    if (!isParty) throw new Error("You are not part of this invitation");

    // Verify status allows counter-proposal
    if (invitation.status !== "PENDING" && invitation.status !== "NEGOTIATING") {
      throw new Error(`Cannot counter-propose to ${invitation.status} invitation`);
    }

    // Check if we've hit 5 rounds
    if (invitation.negotiationRounds >= 5) {
      // Auto-expire
      await ctx.db.patch(args.invitationId, {
        status: "EXPIRED",
      });
      throw new Error("Negotiation has exceeded maximum 5 rounds and has expired");
    }

    // Update invitation with new terms, increment rounds, and mark turn
    const newRound = invitation.negotiationRounds + 1;
    await ctx.db.patch(args.invitationId, {
      status: "NEGOTIATING",
      proposedRole: args.proposedRole.trim(),
      resourceContribution: args.resourceContribution ? args.resourceContribution.trim() : undefined,
      revenueSharing: args.revenueSharing,
      negotiationRounds: newRound,
      // Track that this org just proposed → the OTHER party must respond next
      lastProposedBy: orgId,
    });

    // Record counter-proposal in history
    const historyEntry = await ctx.db.insert("negotiationHistory", {
      invitationId: args.invitationId,
      round: newRound,
      proposedBy: orgId,
      proposedRole: args.proposedRole.trim(),
      resourceContribution: args.resourceContribution ? args.resourceContribution.trim() : undefined,
      revenueSharing: args.revenueSharing,
      notes: args.notes ? args.notes.trim() : undefined,
      respondedBy: undefined,
      response: "COUNTER_PROPOSED",
    });

    return historyEntry;
  },
});

/**
 * Update invitation response deadline
 */
export const updateInvitationDeadline = mutation({
  args: {
    invitationId: v.id("invitations"),
    newDeadline: v.number(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await assertOrgMembership(ctx);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new Error("Invitation not found");

    // Only sender can update deadline
    if (invitation.senderOrgId !== orgId) {
      throw new Error("Only the invitation sender can update the deadline");
    }

    await ctx.db.patch(args.invitationId, {
      responseDeadline: args.newDeadline,
    });
  },
});

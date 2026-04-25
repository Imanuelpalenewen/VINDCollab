import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, internalQuery, mutation, query } from "./_generated/server";

async function assertOrgMembership(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user?.orgId) throw new Error("No organization found");
  return { userId, user, orgId: user.orgId };
}

async function assertEventAccess(ctx: any, eventId: Id<"events">, orgId: Id<"organizations">) {
  const event = await ctx.db.get(eventId);
  if (!event) throw new Error("Event not found");

  if (event.hostOrgId === orgId) return event;

  const partnerships = await ctx.db
    .query("partnerships")
    .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
    .collect();

  const isPartner = partnerships.some(
    (p: any) => p.partnerOrgId === orgId && p.status === "ACCEPTED"
  );

  if (!isPartner) throw new Error("Not a partner for this event");

  return event;
}

async function getMessageSenderDetails(
  ctx: any,
  senderUserId: Id<"users">,
  senderOrgId?: Id<"organizations">
) {
  const senderUser = await ctx.db.get(senderUserId);
  const resolvedOrgId = senderOrgId ?? senderUser?.orgId;
  const senderOrg = resolvedOrgId ? await ctx.db.get(resolvedOrgId) : null;

  return {
    senderUser: senderUser
      ? {
          _id: senderUser._id,
          name: senderUser.name,
          avatarUrl: senderUser.avatarUrl,
        }
      : null,
    senderOrg,
    senderDisplayName: senderUser?.name ?? senderOrg?.name ?? "Unknown",
  };
}

export const createRoom = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    type: v.union(
      v.literal("EVENT"),
      v.literal("TASK"),
      v.literal("ANNOUNCEMENT")
    ),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await assertOrgMembership(ctx);
    await assertEventAccess(ctx, args.eventId, orgId);

    // Check if room with same eventId + type already exists
    const existingRooms = await ctx.db
      .query("chatRooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const existing = existingRooms.find((r) => r.type === args.type && r.name === args.name);
    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("chatRooms", {
      eventId: args.eventId,
      name: args.name,
      type: args.type,
      createdBy: userId,
    });
  },
});

export const sendMessage = mutation({
  args: {
    roomId: v.id("chatRooms"),
    content: v.string(),
    attachmentUrl: v.optional(v.string()),
    replyToMessageId: v.optional(v.id("chatMessages")),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await assertOrgMembership(ctx);

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const event = await assertEventAccess(ctx, room.eventId, orgId);

    if (event.status === "COMPLETED") {
      throw new Error("Cannot send messages in a completed event");
    }

    if (room.type === "ANNOUNCEMENT" && event.hostOrgId !== orgId) {
      throw new Error("Only the host can send announcements");
    }

    return await ctx.db.insert("chatMessages", {
      roomId: args.roomId,
      senderUserId: userId,
      content: args.content,
      attachmentUrl: args.attachmentUrl,
      replyToMessageId: args.replyToMessageId,
      isEdited: false,
    });
  },
});

export const editMessage = mutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertOrgMembership(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (message.senderUserId !== userId) {
      throw new Error("You can only edit your own messages");
    }

    const timeSinceCreation = Date.now() - message._creationTime;
    if (timeSinceCreation > 15 * 60 * 1000) {
      throw new Error("Messages can only be edited within 15 minutes");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      isEdited: true,
      editedAt: Date.now(),
    });
  },
});

export const updateReadReceipt = mutation({
  args: {
    roomId: v.id("chatRooms"),
    lastReadMessageId: v.optional(v.id("chatMessages")),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertOrgMembership(ctx);

    const existing = await ctx.db
      .query("chatReadReceipts")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", userId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastReadMessageId: args.lastReadMessageId,
        lastReadAt: Date.now(),
      });
    } else {
      await ctx.db.insert("chatReadReceipts", {
        roomId: args.roomId,
        userId: userId,
        lastReadMessageId: args.lastReadMessageId,
        lastReadAt: Date.now(),
      });
    }
  },
});

export const getRoomsByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.log(`[getRoomsByEvent] userId is null! eventId: ${args.eventId}`);
      return [];
    }

    const rooms = await ctx.db
      .query("chatRooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    console.log(`[getRoomsByEvent] eventId: ${args.eventId}, userId: ${userId}, rooms found: ${rooms.length}`);
    return rooms;
  },
});

export const getMyRooms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.orgId) return [];

    // Events where I am host
    const hostedEvents = await ctx.db
      .query("events")
      .withIndex("by_host", (q) => q.eq("hostOrgId", user.orgId!))
      .collect();

    // Events where I am accepted partner
    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerOrgId", user.orgId!))
      .collect();

    const acceptedPartnerships = partnerships.filter(
      (p) => p.status === "ACCEPTED"
    );

    const partnerEventPromises = acceptedPartnerships.map((p) =>
      ctx.db.get(p.eventId)
    );
    const partnerEvents = (await Promise.all(partnerEventPromises)).filter(
      Boolean
    );

    const allEvents = [...hostedEvents, ...partnerEvents];
    const seenEvents = new Set<string>();
    const uniqueEvents = allEvents.filter((e) => {
      if (!e || seenEvents.has(e._id)) return false;
      seenEvents.add(e._id);
      return true;
    });

    const rooms: any[] = [];
    for (const event of uniqueEvents) {
      if (!event) continue;
      const eventRooms = await ctx.db
        .query("chatRooms")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();

      for (const room of eventRooms) {
        rooms.push({ ...room, eventTitle: event.title });
      }
    }

    return rooms;
  },
});

export const getMyUnreadCounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.orgId) return [];

    const hostedEvents = await ctx.db
      .query("events")
      .withIndex("by_host", (q) => q.eq("hostOrgId", user.orgId!))
      .collect();

    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerOrgId", user.orgId!))
      .collect();

    const acceptedPartnerships = partnerships.filter(
      (p) => p.status === "ACCEPTED"
    );

    const partnerEventPromises = acceptedPartnerships.map((p) =>
      ctx.db.get(p.eventId)
    );
    const partnerEvents = (await Promise.all(partnerEventPromises)).filter(
      Boolean
    );

    const allEvents = [...hostedEvents, ...partnerEvents];
    const seenEvents = new Set<string>();
    const uniqueEvents = allEvents.filter((e) => {
      if (!e || seenEvents.has(e._id)) return false;
      seenEvents.add(e._id);
      return true;
    });

    const allRooms: any[] = [];
    for (const event of uniqueEvents) {
      if (!event) continue;
      const eventRooms = await ctx.db
        .query("chatRooms")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      allRooms.push(...eventRooms);
    }

    const counts = await Promise.all(
      allRooms.map(async (room) => {
        const receipt = await ctx.db
          .query("chatReadReceipts")
          .withIndex("by_room_user", (q) =>
            q.eq("roomId", room._id).eq("userId", userId)
          )
          .unique();

        let unreadCount = 0;
        const messages = await ctx.db
          .query("chatMessages")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .order("desc")
          .take(100);

        if (!receipt || !receipt.lastReadMessageId) {
          unreadCount = messages.length;
        } else {
          const lastReadIndex = messages.findIndex(
            (m) => m._id === receipt.lastReadMessageId
          );
          if (lastReadIndex === -1) {
            unreadCount = messages.length;
          } else {
            unreadCount = lastReadIndex;
          }
        }

        return {
          roomId: room._id,
          unreadCount,
        };
      })
    );

    return counts;
  },
});

export const getMessagesByRoom = query({
  args: {
    roomId: v.id("chatRooms"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: "" };

    const page = await ctx.db
      .query("chatMessages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc") // We want the newest messages first for the inverted FlatList
      .paginate(args.paginationOpts);

    const messagesWithIdentity = await Promise.all(
      page.page.map(async (msg) => {
        const sender = await getMessageSenderDetails(
          ctx,
          msg.senderUserId,
          msg.senderOrgId
        );
        return {
          ...msg,
          senderUser: sender.senderUser,
          senderOrg: sender.senderOrg,
          senderDisplayName: sender.senderDisplayName,
        };
      })
    );

    return {
      ...page,
      page: messagesWithIdentity,
    };
  },
});

export const getUnreadCounts = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rooms = await ctx.db
      .query("chatRooms")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const counts = await Promise.all(
      rooms.map(async (room) => {
        const receipt = await ctx.db
          .query("chatReadReceipts")
          .withIndex("by_room_user", (q) =>
            q.eq("roomId", room._id).eq("userId", userId)
          )
          .unique();

        let unreadCount = 0;
        const messages = await ctx.db
          .query("chatMessages")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .order("desc")
          .take(100); // Limit to 100 for performance

        if (!receipt || !receipt.lastReadMessageId) {
          // All fetched messages are unread
          unreadCount = messages.length;
        } else {
          // Find the last read message in the list
          const lastReadIndex = messages.findIndex(
            (m) => m._id === receipt.lastReadMessageId
          );
          if (lastReadIndex === -1) {
            // Not found in the last 100, meaning all 100 are unread
            unreadCount = messages.length;
          } else {
            // Messages before the last read message in the descending array are newer
            unreadCount = lastReadIndex;
          }
        }

        return {
          roomId: room._id,
          unreadCount,
        };
      })
    );

    return counts;
  },
});

export const debugGetAllRooms = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("chatRooms").collect();
  }
});

// Returns distinct events that have at least one chat room, for the Chat tab list
export const getMyEventsWithRooms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.orgId) return [];

    const hostedEvents = await ctx.db
      .query("events")
      .withIndex("by_host", (q) => q.eq("hostOrgId", user.orgId!))
      .collect();

    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerOrgId", user.orgId!))
      .collect();

    const accepted = partnerships.filter((p) => p.status === "ACCEPTED");
    const partnerEvents = (await Promise.all(accepted.map((p) => ctx.db.get(p.eventId)))).filter(Boolean);

    const allEvents = [...hostedEvents, ...partnerEvents];
    const seen = new Set<string>();
    const uniqueEvents = allEvents.filter((e) => {
      if (!e || seen.has(e._id)) return false;
      seen.add(e._id);
      return true;
    });

    const result: Array<{ _id: Id<"events">; title: string; eventType: string; status: string }> = [];
    for (const event of uniqueEvents) {
      if (!event) continue;
      // Collect all rooms for this event (bounded by eventId index — safe)
      const allRoomsForEvent = await ctx.db
        .query("chatRooms")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      // Only count rooms that are actually visible in the UI:
      // exclude partnership side-channels and TASK rooms
      const visibleRooms = allRoomsForEvent.filter(
        (r) => !r.name.startsWith("partnership-") && r.type !== "TASK"
      );
      if (visibleRooms.length > 0) {
        result.push({
          _id: event._id,
          title: event.title,
          eventType: event.eventType,
          status: event.status,
        });
      }
    }
    return result;
  },
});

// Internal: last 5 messages for smart reply context
export const getRecentMessagesForSmartReply = internalQuery({
  args: { roomId: v.id("chatRooms") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(5);
    return await Promise.all(
      messages.reverse().map(async (msg) => {
        const sender = await getMessageSenderDetails(
          ctx,
          msg.senderUserId,
          msg.senderOrgId
        );
        return { content: msg.content, senderName: sender.senderDisplayName };
      })
    );
  },
});

// Action: call Gemini 2.0 Flash to generate 3 smart reply suggestions
export const getSmartReplies = action({
  args: { roomId: v.id("chatRooms") },
  handler: async (ctx, args) => {
    const messages: Array<{ content: string; senderName: string }> =
      await ctx.runQuery(internal.chat.getRecentMessagesForSmartReply, { roomId: args.roomId });

    if (messages.length === 0) return { replies: [] as string[] };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { replies: [] as string[] };

    const context = messages.map((m) => `${m.senderName}: ${m.content}`).join("\n");
    const prompt = `You are a chat assistant. Based on this conversation:\n${context}\n\nSuggest exactly 3 short reply options (max 100 characters each). Return ONLY valid JSON: {"replies": ["reply1", "reply2", "reply3"]}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
          }),
        }
      );
      if (!response.ok) return { replies: [] as string[] };
      const data = await response.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { replies: [] as string[] };
      const parsed = JSON.parse(match[0]);
      const replies: string[] = (parsed.replies ?? []).slice(0, 3).map((r: string) => r.slice(0, 100));
      return { replies };
    } catch {
      return { replies: [] as string[] };
    }
  },
});

// ─── Migration ───────────────────────────────────────────────────────────────
// Run once with: npx convex run chat:backfillEventRooms
// Ensures every event that has at least one ACCEPTED partnership also has
// the default #general (EVENT) and #announcements (ANNOUNCEMENT) chat rooms.
export const backfillEventRooms = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Collect all accepted partnerships
    const allPartnerships = await ctx.db.query("partnerships").collect();
    const accepted = allPartnerships.filter((p) => p.status === "ACCEPTED");

    // 2. De-duplicate event IDs so we process each event once
    const eventIds = [...new Set(accepted.map((p) => p.eventId))];

    // 3. Pre-load users so we have a valid createdBy reference (migration only)
    const allUsers = await ctx.db.query("users").take(100);

    let created = 0;

    for (const eventId of eventIds) {
      const event = await ctx.db.get(eventId);
      if (!event) continue;

      // Pick a user from the host org as the room creator; fall back to any user
      const creator =
        allUsers.find((u) => u.orgId === event.hostOrgId) ?? allUsers[0];
      if (!creator) continue;

      // 4. Check existing rooms for this event
      const existingRooms = await ctx.db
        .query("chatRooms")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .collect();

      const hasGeneral = existingRooms.some((r) => r.name === "#general");
      const hasAnnouncements = existingRooms.some(
        (r) => r.name === "#announcements"
      );

      // 5. Create whichever rooms are missing
      if (!hasGeneral) {
        await ctx.db.insert("chatRooms", {
          eventId,
          name: "#general",
          type: "EVENT",
          createdBy: creator._id,
        });
        created++;
      }

      if (!hasAnnouncements) {
        await ctx.db.insert("chatRooms", {
          eventId,
          name: "#announcements",
          type: "ANNOUNCEMENT",
          createdBy: creator._id,
        });
        created++;
      }
    }

    return {
      processedEvents: eventIds.length,
      roomsCreated: created,
      message: `Backfill complete. Processed ${eventIds.length} event(s), created ${created} room(s).`,
    };
  },
});

// ─── Migration: Sender Org Backfill ─────────────────────────────────────────
// Optional maintenance utility for legacy analytics/audits that still expect
// senderOrgId on chat messages. It fills only rows that are currently missing.
export const backfillSenderOrgFromUser = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    maxItems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const caller = await ctx.db.get(userId);
    if (!caller || caller.role !== "admin") {
      throw new Error("Only admin can run this migration");
    }

    const dryRun = args.dryRun ?? true;
    const maxItems = Math.max(1, Math.min(args.maxItems ?? 2000, 10000));

    const allMessages = await ctx.db.query("chatMessages").take(maxItems);

    let inspected = 0;
    let missingSenderOrg = 0;
    let patched = 0;
    let skippedNoSenderUser = 0;
    let skippedSenderUserNoOrg = 0;

    for (const msg of allMessages) {
      inspected++;

      if (msg.senderOrgId) {
        continue;
      }

      missingSenderOrg++;

      const senderUser = await ctx.db.get(msg.senderUserId);
      if (!senderUser) {
        skippedNoSenderUser++;
        continue;
      }

      if (!senderUser.orgId) {
        skippedSenderUserNoOrg++;
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(msg._id, {
          senderOrgId: senderUser.orgId,
        });
      }

      patched++;
    }

    return {
      dryRun,
      inspected,
      missingSenderOrg,
      patched,
      skippedNoSenderUser,
      skippedSenderUserNoOrg,
      maxItems,
      message: dryRun
        ? "Dry-run complete. Re-run with dryRun=false to apply patches."
        : "Backfill complete.",
    };
  },
});

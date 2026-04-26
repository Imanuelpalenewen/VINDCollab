/**
 * convex/notifications.ts
 */

import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

export type NotificationType =
  | "AI_ALERT"
  | "CHAT_MESSAGE"
  | "PARTNER_ACCEPTED"
  | "PARTNER_DECLINED"
  | "PROGRESS_REPORT"
  | "TASK_UPDATE";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  riskLevel?: "GREEN" | "YELLOW" | "RED";
  eventId?: string;
  roomId?: string;
}

export const getNotifications = query({
  args: {},
  handler: async (ctx): Promise<AppNotification[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user?.orgId) return [];

    const orgId = user.orgId;
    const notifications: AppNotification[] = [];
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // ── 1. Progress Reports + AI Alerts ──────────────────────────────────────
    // Fetch hosted events first so we have event.title without calling db.get again
    const hostedEvents: Doc<"events">[] = await ctx.db
      .query("events")
      .withIndex("by_host", (q) => q.eq("hostOrgId", orgId))
      .collect();

    for (const hostedEvent of hostedEvents) {
      const eid: Id<"events"> = hostedEvent._id;
      const hid: Id<"organizations"> = orgId;

      const reports: Doc<"progressReports">[] = await ctx.db
        .query("progressReports")
        .withIndex("by_event_host", (q) => q.eq("eventId", eid).eq("hostOrgId", hid))
        .order("desc")
        .take(2);

      for (const report of reports) {
        if (now - report.generatedAt > SEVEN_DAYS) continue;

        notifications.push({
          id: `report-${report._id}`,
          type: "PROGRESS_REPORT",
          title: "Progress report generated",
          body: `View your analytics summary for ${hostedEvent.title}`,
          timestamp: report.generatedAt,
          read: false,
          riskLevel: report.riskLevel,
          eventId: hostedEvent._id,
        });

        for (const alert of report.alerts) {
          if (now - alert.detectedAt > SEVEN_DAYS) continue;
          notifications.push({
            id: `alert-${report._id}-${alert.id}`,
            type: "AI_ALERT",
            title: `AI detected: ${alert.title}`,
            body: alert.description,
            timestamp: alert.detectedAt,
            read: false,
            riskLevel: alert.riskLevel,
            eventId: hostedEvent._id,
          });
        }
      }
    }

    // ── 2. Chat messages from other orgs ─────────────────────────────────────
    const partnerPartnerships: Doc<"partnerships">[] = await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerOrgId", orgId))
      .filter((q) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();

    const involvedEventIds = new Set<Id<"events">>([
      ...hostedEvents.map((e) => e._id),
      ...partnerPartnerships.map((p) => p.eventId),
    ]);

    for (const eventId of involvedEventIds) {
      const rooms: Doc<"chatRooms">[] = await ctx.db
        .query("chatRooms")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .collect();

      for (const room of rooms) {
        const msgs: Doc<"chatMessages">[] = await ctx.db
          .query("chatMessages")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .order("desc")
          .take(3);

        for (const msg of msgs) {
          if (now - msg._creationTime > SEVEN_DAYS) continue;
          if (msg.senderOrgId === orgId) continue;

          let senderName = "Someone";
          if (msg.senderOrgId) {
            const senderOrg: Doc<"organizations"> | null =
              await ctx.db.get(msg.senderOrgId);
            if (senderOrg) senderName = senderOrg.name;
          }

          notifications.push({
            id: `chat-${msg._id}`,
            type: "CHAT_MESSAGE",
            title: `${senderName} sent a message in ${room.name}`,
            body: msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content,
            timestamp: msg._creationTime,
            read: false,
            eventId: eventId,
            roomId: room._id,
          });
        }
      }
    }

    // ── 3. Invitation responses (invitations we sent) ─────────────────────────
    const sentInvitations: Doc<"invitations">[] = await ctx.db
      .query("invitations")
      .withIndex("by_sender", (q) => q.eq("senderOrgId", orgId))
      .collect();

    for (const inv of sentInvitations) {
      if (inv.status === "PENDING") continue;
      if (now - inv._creationTime > SEVEN_DAYS) continue;

      const recipientOrg: Doc<"organizations"> | null = await ctx.db.get(inv.recipientOrgId);
      const invEvent: Doc<"events"> | null = await ctx.db.get(inv.eventId);
      const orgName = recipientOrg?.name ?? "An organization";
      const eventName = invEvent?.title ?? "your event";

      if (inv.status === "ACCEPTED") {
        notifications.push({
          id: `inv-accepted-${inv._id}`,
          type: "PARTNER_ACCEPTED",
          title: `${orgName} accepted your invite`,
          body: `Now active in ${eventName}`,
          timestamp: inv._creationTime,
          read: false,
          eventId: inv.eventId,
        });
      } else if (inv.status === "DECLINED") {
        notifications.push({
          id: `inv-declined-${inv._id}`,
          type: "PARTNER_DECLINED",
          title: `${orgName} declined your invite`,
          body: inv.declineReason ?? "They declined the partnership",
          timestamp: inv._creationTime,
          read: false,
          eventId: inv.eventId,
        });
      } else if (inv.status === "NEGOTIATING") {
        notifications.push({
          id: `inv-counter-${inv._id}`,
          type: "CHAT_MESSAGE",
          title: `${orgName} sent a counter-proposal`,
          body: `Round ${inv.negotiationRounds}/5 — review their proposal`,
          timestamp: inv._creationTime,
          read: false,
          eventId: inv.eventId,
        });
      }
    }

    // ── 4. New invitations received ───────────────────────────────────────────
    const receivedInvitations: Doc<"invitations">[] = await ctx.db
      .query("invitations")
      .withIndex("by_recipient", (q) => q.eq("recipientOrgId", orgId))
      .collect();

    for (const inv of receivedInvitations) {
      if (inv.status !== "PENDING") continue;
      if (now - inv._creationTime > SEVEN_DAYS) continue;

      const senderOrg: Doc<"organizations"> | null = await ctx.db.get(inv.senderOrgId);
      const invEvent: Doc<"events"> | null = await ctx.db.get(inv.eventId);

      notifications.push({
        id: `inv-received-${inv._id}`,
        type: "PARTNER_ACCEPTED",
        title: `${senderOrg?.name ?? "An organization"} invited you to collaborate`,
        body: `For: ${invEvent?.title ?? "an event"} · Role: ${inv.proposedRole}`,
        timestamp: inv._creationTime,
        read: false,
        eventId: inv.eventId,
      });
    }

    // ── 5. Sort + deduplicate ─────────────────────────────────────────────────
    const unique = Array.from(
      new Map(notifications.map((n) => [n.id, n])).values()
    );
    unique.sort((a, b) => b.timestamp - a.timestamp);
    return unique.slice(0, 50);
  },
});
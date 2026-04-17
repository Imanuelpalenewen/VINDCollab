import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.string(),
    name: v.string(),
    orgId: v.optional(v.id("organizations")),
    role: v.literal("admin"),
    avatarUrl: v.optional(v.string()),
    lastSeenAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  organizations: defineTable({
    name: v.string(),
    category: v.string(),
    capabilities: v.array(v.string()),
    logoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    isVerified: v.boolean(),
    inviteCode: v.string(),
    /** Timestamp when inviteCode was last generated — used to calculate 15-minute expiry */
    inviteCodeCreatedAt: v.optional(v.number()),
  }).index("by_invite_code", ["inviteCode"]),


  events: defineTable({
    hostOrgId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    eventType: v.string(),
    status: v.union(v.literal("DRAFT"), v.literal("OPEN"), v.literal("PLANNING"), v.literal("EXECUTING"), v.literal("COMPLETED")),
    startDate: v.number(),
    endDate: v.number(),
    requirements: v.array(v.string()),
    partnerCriteria: v.array(v.string()),
  }).index("by_host", ["hostOrgId"]).index("by_status", ["status"]),

  partnerships: defineTable({
    eventId: v.id("events"),
    hostOrgId: v.id("organizations"),
    partnerOrgId: v.id("organizations"),
    status: v.union(v.literal("PENDING"), v.literal("ACCEPTED"), v.literal("DECLINED")),
    role: v.string(),
    terms: v.optional(v.string()),
  }).index("by_event", ["eventId"]).index("by_partner", ["partnerOrgId"]),

  tasks: defineTable({
    eventId: v.id("events"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("TODO"), v.literal("IN_PROGRESS"), v.literal("DONE")),
    assignedOrgId: v.optional(v.id("organizations")),
    estimatedHours: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    isAiGenerated: v.boolean(),
    phase: v.optional(v.string()),
  }).index("by_event", ["eventId"]).index("by_status", ["status"]),

  chatRooms: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    type: v.union(v.literal("EVENT"), v.literal("TASK"), v.literal("ANNOUNCEMENT")),
    createdBy: v.id("users"),
  }).index("by_event", ["eventId"]),

  chatMessages: defineTable({
    roomId: v.id("chatRooms"),
    senderOrgId: v.id("organizations"),
    senderUserId: v.id("users"),
    content: v.string(),
    attachmentUrl: v.optional(v.string()),
    isEdited: v.boolean(),
    editedAt: v.optional(v.number()),
  }).index("by_room", ["roomId"]),

  chatReadReceipts: defineTable({
    roomId: v.id("chatRooms"),
    userId: v.id("users"),
    lastReadMessageId: v.optional(v.id("chatMessages")),
    lastReadAt: v.number(),
  }).index("by_room_user", ["roomId", "userId"]),

  ai_cache: defineTable({
    type: v.union(v.literal("PARTNER_REC"), v.literal("TASK_BREAKDOWN"), v.literal("PROGRESS_REPORT"), v.literal("POST_EVENT")),
    eventId: v.id("events"),
    payload: v.string(),
    generatedAt: v.number(),
    expiresAt: v.optional(v.number()),
  }).index("by_event_type", ["eventId", "type"]),
});
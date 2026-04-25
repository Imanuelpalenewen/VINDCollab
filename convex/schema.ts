import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    priority: v.optional(v.union(v.literal("HIGH"), v.literal("MED"), v.literal("LOW"))),
    isCritical: v.optional(v.boolean()),
    parentTaskId: v.optional(v.id("tasks")),
    order: v.optional(v.number()),
    aiRationale: v.optional(v.string()),
  }).index("by_event", ["eventId"]).index("by_status", ["status"]),

  taskDependencies: defineTable({
    taskId: v.id("tasks"),
    dependsOnTaskId: v.id("tasks"),
    dependencyType: v.union(v.literal("FINISH_TO_START"), v.literal("START_TO_START")),
  }).index("by_task", ["taskId"]).index("by_depends_on", ["dependsOnTaskId"]),

  chatRooms: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    type: v.union(v.literal("EVENT"), v.literal("TASK"), v.literal("ANNOUNCEMENT")),
    createdBy: v.id("users"),
  }).index("by_event", ["eventId"]),

  chatMessages: defineTable({
    roomId: v.id("chatRooms"),
    senderOrgId: v.optional(v.id("organizations")),
    senderUserId: v.id("users"),
    content: v.string(),
    attachmentUrl: v.optional(v.string()),
    replyToMessageId: v.optional(v.id("chatMessages")),
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

  invitations: defineTable({
    eventId: v.id("events"),
    senderOrgId: v.id("organizations"),
    recipientOrgId: v.id("organizations"),
    status: v.union(
      v.literal("PENDING"),
      v.literal("ACCEPTED"),
      v.literal("DECLINED"),
      v.literal("NEGOTIATING"),
      v.literal("EXPIRED")
    ),
    proposedRole: v.string(),
    resourceContribution: v.optional(v.string()),
    revenueSharing: v.optional(v.object({
      percentage: v.number(),
      method: v.string(),
    })),
    responseDeadline: v.number(),
    personalMessage: v.optional(v.string()),
    declineReason: v.optional(v.string()),
    negotiationRounds: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_sender", ["senderOrgId"])
    .index("by_recipient", ["recipientOrgId"])
    .index("by_status", ["status"]),

  negotiationHistory: defineTable({
    invitationId: v.id("invitations"),
    round: v.number(),
    proposedBy: v.id("organizations"),
    proposedRole: v.string(),
    resourceContribution: v.optional(v.string()),
    revenueSharing: v.optional(v.object({
      percentage: v.number(),
      method: v.string(),
    })),
    notes: v.optional(v.string()),
    respondedBy: v.optional(v.id("organizations")),
    response: v.optional(v.union(
      v.literal("ACCEPTED"),
      v.literal("DECLINED"),
      v.literal("COUNTER_PROPOSED")
    )),
  }).index("by_invitation", ["invitationId"]),

  progressReports: defineTable({
    eventId: v.id("events"),
    hostOrgId: v.id("organizations"),
    riskScore: v.number(),
    riskLevel: v.union(v.literal("GREEN"), v.literal("YELLOW"), v.literal("RED")),
    completionRate: v.number(),
    velocity: v.number(),
    predictedCompletionDate: v.optional(v.number()),
    alerts: v.array(v.object({
      id: v.string(),
      title: v.string(),
      description: v.string(),
      riskLevel: v.union(v.literal("GREEN"), v.literal("YELLOW"), v.literal("RED")),
      affectedTaskIds: v.array(v.id("tasks")),
      suggestions: v.array(v.string()),
      detectedAt: v.number(),
    })),
    stagnantTasks: v.array(v.object({
      taskId: v.id("tasks"),
      title: v.string(),
      statusSince: v.number(),
      assignedOrgId: v.id("organizations"),
    })),
    blockedOrgResponseTime: v.array(v.object({
      orgId: v.id("organizations"),
      avgResponseTime: v.number(),
      isUnresponsive: v.boolean(),
    })),
    generatedAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_event_host", ["eventId", "hostOrgId"])
    .index("by_event", ["eventId"]),

  alertFeedback: defineTable({
    progressReportId: v.id("progressReports"),
    alertId: v.string(),
    action: v.union(v.literal("ACKNOWLEDGED"), v.literal("DISMISSED")),
    reason: v.optional(v.string()),
    userId: v.id("users"),
    timestamp: v.number(),
  }).index("by_report", ["progressReportId"]),

  postEventReports: defineTable({
    eventId: v.id("events"),
    generatedAt: v.number(),
    executiveSummary: v.string(),
    overallScore: v.number(),
    totalTasks: v.number(),
    completionRate: v.number(),
    onTimeRate: v.number(),
    avgResponseTime: v.number(),
    lessonsLearned: v.array(v.string()),
    partnerScores: v.array(v.object({
      orgId: v.id("organizations"),
      orgName: v.string(),
      score: v.number(),
      tasksCompleted: v.number(),
      totalTasks: v.number(),
      avgHours: v.number(),
    })),
    recommendations: v.array(v.string()),
  }).index("by_event", ["eventId"]),
});
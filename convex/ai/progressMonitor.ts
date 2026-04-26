import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query
} from "../_generated/server";
import { callMistral } from "./_mistralClient";

const CACHE_TTL_MS = 48 * 60 * 60 * 1000;
const STAGNANT_THRESHOLD_MS = 48 * 60 * 60 * 1000;

// Internal Queries
export const getEventContext = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const acceptedPartnerships = partnerships.filter((p) => p.status === "ACCEPTED");
    const partnerDetailsPromises = acceptedPartnerships.map(async (p) => {
      const org = await ctx.db.get(p.partnerOrgId);
      return { _id: p.partnerOrgId.toString(), name: org?.name ?? "Unknown", role: p.role };
    });
    const partnerDetails = await Promise.all(partnerDetailsPromises);
    return { ...event, partners: partnerDetails };
  },
});

export const getTasksWithContext = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query("tasks").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).collect();
    return await Promise.all(tasks.map(async (task) => {
      let orgName = "";
      if (task.assignedOrgId) {
        const org = await ctx.db.get(task.assignedOrgId);
        orgName = org?.name ?? "";
      }
      return { ...task, assignedOrgName: orgName };
    }));
  },
});

export const calculateVelocity = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query("tasks").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).collect();
    const completed = tasks.filter(t => t.status === "DONE");
    return {
      completedCount: completed.length,
      totalTasks: tasks.length,
      completionRate: tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0,
      velocity: completed.length / 3,
    };
  },
});

export const detectStagnantTasks = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db.query("tasks").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).collect();
    const now = Date.now();
    return tasks.filter(t => t.status === "IN_PROGRESS" && (now - t._creationTime > STAGNANT_THRESHOLD_MS))
      .map(t => ({ taskId: t._id, title: t.title, statusSince: now - t._creationTime, assignedOrgId: t.assignedOrgId! }));
  },
});

export const getCachedProgressReport = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const cached = await ctx.db.query("progressReports").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).first();
    if (!cached || Date.now() - cached.generatedAt > CACHE_TTL_MS) return null;
    return cached;
  },
});

export const saveProgressReport = internalMutation({
  args: {
    eventId: v.id("events"),
    hostOrgId: v.id("organizations"),
    riskScore: v.number(),
    riskLevel: v.union(v.literal("GREEN"), v.literal("YELLOW"), v.literal("RED")),
    completionRate: v.number(),
    velocity: v.number(),
    alerts: v.array(v.any()),
    stagnantTasks: v.array(v.any()),
    blockedOrgResponseTime: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("progressReports").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).first();
    if (existing) await ctx.db.delete(existing._id);
    return await ctx.db.insert("progressReports", { ...args, generatedAt: Date.now(), expiresAt: Date.now() + CACHE_TTL_MS });
  },
});

// Main Action
export const generateProgressReport = internalAction({
  args: { eventId: v.id("events"), forceRefresh: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (!args.forceRefresh) {
      const cached: any = await ctx.runQuery(internal.ai.progressMonitor.getCachedProgressReport, { eventId: args.eventId });
      if (cached) return { ...cached, reportId: cached._id.toString(), fromCache: true, message: "Retrieved from cache" };
    }

    const event: any = await ctx.runQuery(internal.ai.progressMonitor.getEventContext, { eventId: args.eventId });
    if (!event) throw new Error("Event not found");

    const tasks: any = await ctx.runQuery(internal.ai.progressMonitor.getTasksWithContext, { eventId: args.eventId });
    const velocity: any = await ctx.runQuery(internal.ai.progressMonitor.calculateVelocity, { eventId: args.eventId });
    const stagnantTasks: any[] = await ctx.runQuery(internal.ai.progressMonitor.detectStagnantTasks, { eventId: args.eventId });

    // 4. Call Mistral AI
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY not set");

    const userPrompt = `Analyze event "${event.title}". Completion: ${velocity.completionRate.toFixed(1)}%. Stagnant tasks: ${stagnantTasks.length}. Return JSON risk assessment.`;

    const result = await callMistral(apiKey, {
      messages: [
        { role: "system", content: "You are VINDCollab AI. Analyze progress JSON." },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 2048,
      logPrefix: "[ProgressMonitor]",
    });

    let aiAnalysis: any;
    if (result.allRateLimited || !result.data) {
      aiAnalysis = { riskLevel: "GREEN", riskScore: 20, alerts: [] };
    } else {
      aiAnalysis = result.data;
    }

    const reportId: any = await ctx.runMutation(internal.ai.progressMonitor.saveProgressReport, {
      eventId: args.eventId,
      hostOrgId: event.hostOrgId,
      riskLevel: aiAnalysis.riskLevel || "GREEN",
      riskScore: aiAnalysis.riskScore || 0,
      completionRate: velocity.completionRate,
      velocity: velocity.velocity,
      alerts: aiAnalysis.alerts || [],
      stagnantTasks: stagnantTasks.slice(0, 5),
      blockedOrgResponseTime: [],
    });

    return { reportId: reportId.toString(), ...aiAnalysis, completionRate: velocity.completionRate, velocity: velocity.velocity, stagnantTasks, fromCache: false, message: "Analysis complete" };
  },
});

// Public API
export const getProgressReport = query({
  args: { eventId: v.id("events"), timeRange: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const report = await ctx.db.query("progressReports").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).first();
    if (!report) return null;
    return { ...report, velocityData: [], completionData: [], milestoneProgress: [] };
  },
});

export const refreshProgressAnalysis = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    const event = await ctx.db.get(args.eventId);
    if (!event || event.hostOrgId !== user?.orgId) throw new Error("Unauthorized");
    await ctx.scheduler.runAfter(0, internal.ai.progressMonitor.generateProgressReport, { eventId: args.eventId, forceRefresh: true });
    return { scheduled: true };
  },
});

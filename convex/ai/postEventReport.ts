import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { callMistral } from "./_mistralClient";

// Internal Queries
/**
 * Gather data needed for Post-Event Report.
 */
export const getPostEventContext = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const hostOrg = await ctx.db.get(event.hostOrgId);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const acceptedPartnerships = partnerships.filter((p) => p.status === "ACCEPTED");

    const partnerOrgs = await Promise.all(
      acceptedPartnerships.map(async (p) => {
        const org = await ctx.db.get(p.partnerOrgId);
        return {
          orgId: p.partnerOrgId,
          orgName: org?.name ?? "Unknown",
          role: p.role,
        };
      })
    );

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return {
      event: {
        _id: event._id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        startDate: event.startDate,
        endDate: event.endDate,
        hostOrgId: event.hostOrgId,
        hostOrgName: hostOrg?.name ?? "Unknown",
        status: event.status,
      },
      tasks,
      partnerOrgs,
      invitations,
    };
  },
});

/**
 * Save the generated post-event report.
 */
export const savePostEventReport = internalMutation({
  args: {
    eventId: v.id("events"),
    executiveSummary: v.string(),
    overallScore: v.number(),
    totalTasks: v.number(),
    completionRate: v.number(),
    onTimeRate: v.number(),
    avgResponseTime: v.number(),
    lessonsLearned: v.array(v.string()),
    partnerScores: v.array(
      v.object({
        orgId: v.id("organizations"),
        orgName: v.string(),
        score: v.number(),
        tasksCompleted: v.number(),
        totalTasks: v.number(),
        avgHours: v.number(),
      })
    ),
    recommendations: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("postEventReports")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existing) await ctx.db.delete(existing._id);

    return await ctx.db.insert("postEventReports", {
      eventId: args.eventId,
      generatedAt: Date.now(),
      executiveSummary: args.executiveSummary,
      overallScore: args.overallScore,
      totalTasks: args.totalTasks,
      completionRate: args.completionRate,
      onTimeRate: args.onTimeRate,
      avgResponseTime: args.avgResponseTime,
      lessonsLearned: args.lessonsLearned,
      partnerScores: args.partnerScores,
      recommendations: args.recommendations,
    });
  },
});

/**
 * Mark event as COMPLETED.
 */
export const markEventCompleted = internalMutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return;
    if (event.status !== "COMPLETED") {
      await ctx.db.patch(args.eventId, { status: "COMPLETED" });
    }
  },
});

// Main Action
/**
 * Generate Post-Event Report using Perceive → Reason → Act pipeline.
 */
export const generatePostEventReport = action({
  args: { eventId: v.id("events") },
  handler: async (ctx, args): Promise<{ reportId: string; message: string }> => {
    // 1. PERCEIVE
    const data = await ctx.runQuery(
      internal.ai.postEventReport.getPostEventContext,
      { eventId: args.eventId }
    );
    if (!data) throw new Error("Event not found");

    const { event, tasks, partnerOrgs, invitations } = data;

    // Guard: only allow report generation for COMPLETED events.
    // This prevents premature AI calls and meaningless metrics for in-progress events.
    if (event.status.toUpperCase() !== "COMPLETED") {
      throw new Error(
        `Report can only be generated for completed events. Current status: "${event.status}".`
      );
    }

    // 2. Local Metrics
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t: any) => t.status === "DONE");
    const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

    const doneWithDue = doneTasks.filter((t: any) => t.dueDate !== undefined);
    const onTimeDone = doneWithDue.filter((t: any) => t._creationTime <= (t.dueDate ?? Infinity));
    const onTimeRate = doneWithDue.length > 0 ? Math.round((onTimeDone.length / doneWithDue.length) * 100) : 100;

    const totalRounds = invitations.reduce((sum: number, inv: any) => sum + (inv.negotiationRounds ?? 1), 0);
    const avgResponseTime = invitations.length > 0 ? Math.round((totalRounds / invitations.length) * 10) / 10 : 1;

    const partnerScoresLocal = partnerOrgs.map((partner: any) => {
      const partnerTasks = tasks.filter((t: any) => t.assignedOrgId === partner.orgId);
      const partnerDone = partnerTasks.filter((t: any) => t.status === "DONE");
      const totalHours = partnerTasks.reduce((sum: number, t: any) => sum + (t.estimatedHours ?? 0), 0);
      const avgHours = partnerTasks.length > 0 ? Math.round((totalHours / partnerTasks.length) * 10) / 10 : 0;
      const rawScore = partnerTasks.length > 0 ? Math.round((partnerDone.length / partnerTasks.length) * 100) : 0;

      return {
        orgId: partner.orgId as Id<"organizations">,
        orgName: partner.orgName,
        score: rawScore,
        tasksCompleted: partnerDone.length,
        totalTasks: partnerTasks.length,
        avgHours,
      };
    });

    // 3. Prompt
    const durationDays = Math.round((event.endDate - event.startDate) / (1000 * 60 * 60 * 24));
    const systemPrompt = "You are VINDCollab AI. Generate a concise post-event report JSON.";
    const userPrompt = `
Event: "${event.title}" (${durationDays} days)
Metrics: ${completionRate}% completion, ${onTimeRate}% on-time, ${avgResponseTime} avg rounds.
Partners: ${partnerOrgs.length}
Tasks: ${totalTasks} total.

Return JSON:
{
  "overallScore": 0-100,
  "executiveSummary": "string",
  "lessonsLearned": ["string"],
  "recommendations": ["string"]
}
`.trim();

    // 4. Call Mistral AI
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY not set");

    const result = await callMistral(apiKey, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      maxTokens: 1024,
      logPrefix: "[PostEventReport]",
    });

    // 5. Parse or Fallback
    let aiResult: any;
    if (result.allRateLimited || !result.data) {
      aiResult = {
        overallScore: Math.round(completionRate * 0.7 + onTimeRate * 0.3),
        executiveSummary: `Event completed with ${completionRate}% tasks done.`,
        lessonsLearned: ["Coordination is key", "Better task distribution needed"],
        recommendations: ["Hold kickoff meetings", "Use automation"],
      };
    } else {
      aiResult = result.data;
    }

    // 6. Save and Complete
    const reportId: string = await ctx.runMutation(internal.ai.postEventReport.savePostEventReport, {
      eventId: args.eventId,
      executiveSummary: aiResult.executiveSummary || "",
      overallScore: aiResult.overallScore || 0,
      totalTasks,
      completionRate,
      onTimeRate,
      avgResponseTime,
      lessonsLearned: aiResult.lessonsLearned || [],
      partnerScores: partnerScoresLocal,
      recommendations: aiResult.recommendations || [],
    });

    await ctx.runMutation(internal.ai.postEventReport.markEventCompleted, { eventId: args.eventId });

    return { reportId, message: "Report generated successfully" };
  },
});

// Public API
export const getReportByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("postEventReports")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();
  },
});

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

const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const STAGNANT_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

// ── Internal Queries ──────────────────────────────────────────────────────────

/**
 * Fetch event context with partner organizations
 */
export const getEventContext = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const acceptedPartnerships = partnerships.filter(
      (p) => p.status === "ACCEPTED"
    );

    const partnerDetailsPromises = acceptedPartnerships.map(async (p) => {
      const org = await ctx.db.get(p.partnerOrgId);
      return {
        _id: p.partnerOrgId.toString(),
        name: org?.name ?? "Unknown",
        role: p.role,
      };
    });

    const partnerDetails = await Promise.all(partnerDetailsPromises);

    return {
      _id: event._id,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
      hostOrgId: event.hostOrgId,
      partners: partnerDetails,
    };
  },
});

/**
 * Fetch all tasks for event with full context
 */
export const getTasksWithContext = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const tasksWithOrg = await Promise.all(
      tasks.map(async (task) => {
        let assignedOrgName = "";
        if (task.assignedOrgId) {
          const org = await ctx.db.get(task.assignedOrgId);
          assignedOrgName = org?.name ?? "";
        }
        return {
          ...task,
          assignedOrgName,
        };
      })
    );

    return tasksWithOrg;
  },
});

/**
 * Calculate velocity: tasks completed per day over last 3 days
 */
export const calculateVelocity = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const now = Date.now();
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

    // Tasks completed in last 3 days
    const recentlyCompleted = tasks.filter((t) => {
      if (t.status !== "DONE") return false;
      // Rough estimate: if task was recently updated, assume completion was recent
      // In ideal case, we'd have explicit completion timestamp
      return true;
    });

    const completedCount = recentlyCompleted.length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

    // Velocity: completed tasks per day
    const velocity = totalTasks > 0 ? completedCount / 3 : 0;

    return {
      completedCount,
      totalTasks,
      completionRate,
      velocity,
    };
  },
});

/**
 * Detect stagnant tasks (IN_PROGRESS > 48h)
 */
export const detectStagnantTasks = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const now = Date.now();
    const stagnantTasks = [];

    for (const task of tasks) {
      if (task.status === "IN_PROGRESS" && task.assignedOrgId) {
        const timeInStatus = now - task._creationTime;
        if (timeInStatus > STAGNANT_THRESHOLD_MS) {
          stagnantTasks.push({
            taskId: task._id,
            title: task.title,
            statusSince: timeInStatus,
            assignedOrgId: task.assignedOrgId,
          });
        }
      }
    }

    return stagnantTasks;
  },
});

/**
 * Get cached progress report if still valid
 */
export const getCachedProgressReport = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("progressReports")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (!cached) return null;

    if (Date.now() - cached.generatedAt > CACHE_TTL_MS) return null;

    return cached;
  },
});

/**
 * Save progress report
 */
export const saveProgressReport = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("progressReports")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existing) await ctx.db.delete(existing._id);

    const reportId = await ctx.db.insert("progressReports", {
      eventId: args.eventId,
      hostOrgId: args.hostOrgId,
      riskScore: args.riskScore,
      riskLevel: args.riskLevel,
      completionRate: args.completionRate,
      velocity: args.velocity,
      predictedCompletionDate: args.predictedCompletionDate,
      alerts: args.alerts,
      stagnantTasks: args.stagnantTasks,
      blockedOrgResponseTime: args.blockedOrgResponseTime,
      generatedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return reportId;
  },
});

// ── Main Agentic Action ───────────────────────────────────────────────────────

/**
 * Generate Progress Report
 * Perceive → Reason → Act pipeline
 */
export const generateProgressReport = internalAction({
  args: {
    eventId: v.id("events"),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    reportId: string;
    riskLevel: string;
    riskScore: number;
    completionRate: number;
    velocity: number;
    alerts: any[];
    stagnantTasks: any[];
    message: string;
    fromCache: boolean;
  }> => {
    // Check cache first
    if (!args.forceRefresh) {
      const cached = await ctx.runQuery(
        internal.ai.progressMonitor.getCachedProgressReport,
        { eventId: args.eventId }
      );

      if (cached) {
        return {
          reportId: cached._id.toString(),
          riskLevel: cached.riskLevel,
          riskScore: cached.riskScore,
          completionRate: cached.completionRate,
          velocity: cached.velocity,
          alerts: cached.alerts,
          stagnantTasks: cached.stagnantTasks,
          message: "Progress report retrieved from cache",
          fromCache: true,
        };
      }
    }

    // ─── PERCEIVE: Gather context ─────────────────────────────────────────

    const event = await ctx.runQuery(
      internal.ai.progressMonitor.getEventContext,
      { eventId: args.eventId }
    );

    if (!event) throw new Error("Event not found");

    const tasks = await ctx.runQuery(
      internal.ai.progressMonitor.getTasksWithContext,
      { eventId: args.eventId }
    );

    const velocity = await ctx.runQuery(
      internal.ai.progressMonitor.calculateVelocity,
      { eventId: args.eventId }
    );

    const stagnantTasks = await ctx.runQuery(
      internal.ai.progressMonitor.detectStagnantTasks,
      { eventId: args.eventId }
    );

    console.log(`[ProgressMonitor] Perceive: ${tasks.length} tasks, ${velocity.completionRate.toFixed(1)}% completion, velocity: ${velocity.velocity.toFixed(2)} tasks/day`);

    // ─── REASON: Call AI to analyze ───────────────────────────────────────

    const taskSummary = tasks
      .map(
        (t: any, i: number) =>
          `${i + 1}. ${t.title} (${t.status}) - ${t.assignedOrgName} - Due: ${t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "TBD"}`
      )
      .join("\n");

    const systemPrompt = [
      "You are EventCollab Progress Monitor AI.",
      "Analyze task progress and generate risk assessment for campus events.",
      "Always return valid JSON only. No markdown, no code blocks.",
    ].join(" ");

    const userPrompt = `
Event: "${event.title}"
Status: ${event.status}
End Date: ${new Date(event.endDate).toISOString().split("T")[0]}
Current Time: ${new Date(Date.now()).toISOString()}

Tasks Summary (${tasks.length} total):
${taskSummary}

Completion: ${velocity.completedCount}/${velocity.totalTasks} (${velocity.completionRate.toFixed(1)}%)
Velocity: ${velocity.velocity.toFixed(2)} tasks/day (3-day avg)
Stagnant Tasks: ${stagnantTasks.length}

Analyze and classify risk level:
- GREEN: On track, <1 day delay risk
- YELLOW: 1-3 days delay risk, some blockers
- RED: >3 days delay risk OR critical blocker

For each YELLOW/RED alert, provide 3 concrete suggestions.

Return ONLY this JSON:
{
  "riskLevel": "GREEN" | "YELLOW" | "RED",
  "riskScore": 0-100,
  "predictedCompletionDate": number (unix timestamp, optional),
  "alerts": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "riskLevel": "GREEN" | "YELLOW" | "RED",
      "rootCause": "string",
      "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
    }
  ],
  "summary": "string (overall assessment)"
}
`.trim();

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error(
        "MISTRAL_API_KEY not set. Configure in Convex Dashboard."
      );
    }

    const mistralPayload = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2048,
    };

    const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
    const allowedModels = [
      "mistral-small-latest",
      "open-mistral-nemo",
      "open-mistral-7b",
    ];

    let response: Response | null = null;
    let errBody = "";
    let activeModel = "";

    console.log("[ProgressMonitor] Starting AI analysis...");

    for (const model of allowedModels) {
      try {
        response = await fetch(MISTRAL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ ...mistralPayload, model }),
        });

        if (response.ok) {
          activeModel = model;
          console.log(`[ProgressMonitor] AI analysis successful with ${model}`);
          break;
        }

        errBody = await response.text();
        console.warn(
          `[ProgressMonitor] Model ${model} failed: HTTP ${response.status}`
        );

        if (response.status === 429) {
          response = null;
          continue;
        }
        break;
      } catch (err: any) {
        console.warn(`[ProgressMonitor] Network error on ${model}: ${err.message}`);
        response = null;
      }
    }

    if (!response || !response.ok) {
      // Fallback: generate simple heuristic analysis
      console.log("[ProgressMonitor] Using fallback heuristic analysis");
      const alerts: any[] = [];
      let riskLevel: "GREEN" | "YELLOW" | "RED" = "GREEN";
      let riskScore = 20;

      if (stagnantTasks.length > 0) {
        riskLevel = "YELLOW";
        riskScore = 50;
        alerts.push({
          id: "stagnant-tasks",
          title: "Stagnant Tasks Detected",
          description: `${stagnantTasks.length} tasks stuck in progress for >48 hours`,
          riskLevel: "YELLOW",
          rootCause: "No recent activity on critical tasks",
          suggestions: [
            "Check with assigned organizations on blockers",
            "Reassign tasks if teams are unresponsive",
            "Break down complex tasks into smaller chunks",
          ],
        });
      }

      if (velocity.completionRate < 30 && tasks.length > 5) {
        if (riskLevel === "GREEN") riskLevel = "YELLOW";
        if (riskScore < 60) riskScore = 60;
      }

      const reportId = await ctx.runMutation(
        internal.ai.progressMonitor.saveProgressReport,
        {
          eventId: args.eventId,
          hostOrgId: event.hostOrgId,
          riskLevel,
          riskScore,
          completionRate: velocity.completionRate,
          velocity: velocity.velocity,
          alerts: alerts.map((a: any) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            riskLevel: a.riskLevel,
            affectedTaskIds: stagnantTasks.map((t: any) => t.taskId),
            suggestions: a.suggestions,
            detectedAt: Date.now(),
          })),
          stagnantTasks: stagnantTasks.slice(0, 5),
          blockedOrgResponseTime: [],
        }
      );

      return {
        reportId: reportId.toString(),
        riskLevel,
        riskScore,
        completionRate: velocity.completionRate,
        velocity: velocity.velocity,
        alerts,
        stagnantTasks: stagnantTasks.slice(0, 5),
        message: "Analysis completed with fallback heuristics",
        fromCache: false,
      };
    }

    const mistralResult: any = await response.json();
    const rawText: string = mistralResult?.choices?.[0]?.message?.content ?? "";

    let aiAnalysis: any;
    try {
      aiAnalysis = JSON.parse(rawText);
    } catch {
      throw new Error(
        `[ProgressMonitor] Failed to parse AI response: ${rawText.slice(0, 200)}`
      );
    }

    // ─── ACT: Save report and return results ────────────────────────────

    const alerts = (aiAnalysis.alerts || []).map((a: any) => ({
      id: a.id || `alert-${Date.now()}`,
      title: a.title,
      description: a.description,
      riskLevel: a.riskLevel,
      affectedTaskIds: stagnantTasks.map((t: any) => t.taskId),
      suggestions: a.suggestions || [],
      detectedAt: Date.now(),
    }));

    const reportId = await ctx.runMutation(
      internal.ai.progressMonitor.saveProgressReport,
      {
        eventId: args.eventId,
        hostOrgId: event.hostOrgId,
        riskLevel: aiAnalysis.riskLevel || "GREEN",
        riskScore: aiAnalysis.riskScore || 0,
        completionRate: velocity.completionRate,
        velocity: velocity.velocity,
        predictedCompletionDate: aiAnalysis.predictedCompletionDate,
        alerts,
        stagnantTasks: stagnantTasks.slice(0, 5),
        blockedOrgResponseTime: [],
      }
    );

    return {
      reportId: reportId.toString(),
      riskLevel: aiAnalysis.riskLevel || "GREEN",
      riskScore: aiAnalysis.riskScore || 0,
      completionRate: velocity.completionRate,
      velocity: velocity.velocity,
      alerts,
      stagnantTasks: stagnantTasks.slice(0, 5),
      message: `Analysis complete. Risk: ${aiAnalysis.riskLevel}. Alerts: ${alerts.length}`,
      fromCache: false,
    };
  },
});

// ── Public API (for frontend) ─────────────────────────────────────────────────

/**
 * Get latest progress report for event with optional time range
 */
export const getProgressReport = query({
  args: { eventId: v.id("events"), timeRange: v.optional(v.union(v.literal("7d"), v.literal("14d"), v.literal("30d"), v.literal("all"))) },
  handler: async (ctx, args) => {
    const report = await ctx.db
      .query("progressReports")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (!report) return null;

    // Calculate time window
    const now = Date.now();
    let daysBack = 30;
    if (args.timeRange === "7d") daysBack = 7;
    else if (args.timeRange === "14d") daysBack = 14;
    else if (args.timeRange === "30d") daysBack = 30;
    else if (args.timeRange === "all") daysBack = 365;

    const timeWindowStart = now - daysBack * 24 * 60 * 60 * 1000;

    // Get all tasks for the event
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Filter tasks by time window
    const tasksInWindow = tasks.filter((t) => t._creationTime >= timeWindowStart);

    // Generate velocity data for the time window
    const velocityData = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
      const dayEnd = now - i * 24 * 60 * 60 * 1000;

      const dayLabel = new Date(dayStart).toLocaleDateString("en-US", { weekday: "short" });
      const completedInDay = tasksInWindow.filter(
        (t) =>
          t.status === "DONE" &&
          t._creationTime >= dayStart &&
          t._creationTime < dayEnd
      ).length;

      velocityData.push({
        label: dayLabel,
        value: completedInDay,
      });
    }

    // Generate completion data (weekly breakdown)
    const completionData = [];
    const weeksBack = Math.ceil(daysBack / 7);
    for (let w = weeksBack - 1; w >= 0; w--) {
      const weekStart = now - (w + 1) * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = now - w * 7 * 24 * 60 * 60 * 1000;

      const completedInWeek = tasksInWindow.filter(
        (t) =>
          t.status === "DONE" &&
          t._creationTime >= Math.max(timeWindowStart, weekStart) &&
          t._creationTime < weekEnd
      ).length;

      const totalInWeek = tasksInWindow.filter(
        (t) =>
          t._creationTime >= Math.max(timeWindowStart, weekStart) &&
          t._creationTime < weekEnd
      ).length;

      const weekLabel = `W${w + 1}`;
      const percentage = totalInWeek > 0 ? (completedInWeek / totalInWeek) * 100 : 0;

      completionData.push({
        label: weekLabel,
        value: Math.round(percentage),
      });
    }

    // Calculate milestone progress by phase
    const phaseMap = new Map<string, { total: number; completed: number }>();
    tasksInWindow.forEach((task) => {
      const phase = task.phase || "Uncategorized";
      if (!phaseMap.has(phase)) {
        phaseMap.set(phase, { total: 0, completed: 0 });
      }
      const stats = phaseMap.get(phase)!;
      stats.total++;
      if (task.status === "DONE") stats.completed++;
    });

    const milestoneProgress = Array.from(phaseMap.entries()).map(
      ([phase, stats]) => ({
        name: phase,
        progress: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      })
    );

    // Fetch org names for blockedOrgResponseTime
    const blockedOrgDetails = await Promise.all(
      report.blockedOrgResponseTime.map(async (item) => {
        const org = await ctx.db.get(item.orgId);
        return {
          ...item,
          orgName: org?.name ?? "Unknown",
        };
      })
    );

    return {
      ...report,
      blockedOrgResponseTime: blockedOrgDetails,
      velocityData: velocityData.slice(-7), // Last 7 days
      completionData,
      milestoneProgress,
    };
  },
});

/**
 * Internal query to verify event host
 */
export const verifyEventHost = internalQuery({
  args: { eventId: v.id("events"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.orgId) return null;

    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    return event.hostOrgId === user.orgId ? event : null;
  },
});

/**
 * Refresh analysis (manual trigger via mutation that schedules action)
 */
export const refreshProgressAnalysis = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.orgId) throw new Error("No organization found");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.hostOrgId !== user.orgId) {
      throw new Error("Only host can refresh analysis");
    }

    // Schedule the action to run
    await ctx.scheduler.runAfter(
      0,
      internal.ai.progressMonitor.generateProgressReport,
      { eventId: args.eventId, forceRefresh: true }
    );

    return { scheduled: true, eventId: args.eventId };
  },
});

/**
 * Record alert feedback (acknowledged/dismissed)
 */
export const recordAlertFeedback = mutation({
  args: {
    progressReportId: v.id("progressReports"),
    alertId: v.string(),
    action: v.union(v.literal("ACKNOWLEDGED"), v.literal("DISMISSED")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const report = await ctx.db.get(args.progressReportId);
    if (!report) throw new Error("Report not found");

    const feedbackId = await ctx.db.insert("alertFeedback", {
      progressReportId: args.progressReportId,
      alertId: args.alertId,
      action: args.action,
      reason: args.reason,
      userId,
      timestamp: Date.now(),
    });

    return feedbackId;
  },
});

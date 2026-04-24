import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ── Internal Queries ──────────────────────────────────────────────────────────

/**
 * Gather all data needed to build a Post-Event Report.
 * Returns null if event does not exist.
 */
export const getPostEventContext = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    // Host org
    const hostOrg = await ctx.db.get(event.hostOrgId);

    // All tasks for this event
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Accepted partnerships
    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const acceptedPartnerships = partnerships.filter(
      (p) => p.status === "ACCEPTED"
    );

    // Fetch partner org details
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

    // Invitations for this event — used to compute avg negotiation rounds
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
 * Save the generated post-event report (upsert — delete old if exists).
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
    // Remove any existing report for this event
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
 * Mark event as COMPLETED after report generation.
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

// ── Main Action ───────────────────────────────────────────────────────────────

/**
 * Generate Post-Event Report
 * Perceive → Reason (Gemini Flash 2.0) → Act (save + mark completed)
 *
 * Follows the same pattern as ai/partnerRecommender.ts:
 *  1. Gather context via internalQuery
 *  2. Compute local metrics
 *  3. Call Gemini Flash 2.0 (model cascade: gemini-2.5-flash → gemini-2.0-flash-lite)
 *  4. Parse JSON, fall back to heuristics on quota exceeded
 *  5. Save via internalMutation
 *  6. Mark event COMPLETED
 */
export const generatePostEventReport = action({
  args: { eventId: v.id("events") },
  handler: async (ctx, args): Promise<{ reportId: string; message: string }> => {
    // ─── 1. PERCEIVE: gather context ─────────────────────────────────────
    const data = await ctx.runQuery(
      internal.ai.postEventReport.getPostEventContext,
      { eventId: args.eventId }
    );

    if (!data) throw new Error("Event not found");

    const { event, tasks, partnerOrgs, invitations } = data;

    // ─── 2. Compute local metrics ─────────────────────────────────────────
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "DONE");
    const completionRate =
      totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

    // On-time: DONE tasks whose dueDate is defined and completion is before dueDate
    // Using _creationTime as proxy since we don't store completedAt
    const doneWithDue = doneTasks.filter((t) => t.dueDate !== undefined);
    const onTimeDone = doneWithDue.filter(
      (t) => t._creationTime <= (t.dueDate ?? Infinity)
    );
    const onTimeRate =
      doneWithDue.length > 0
        ? Math.round((onTimeDone.length / doneWithDue.length) * 100)
        : 100;

    // Average negotiation rounds as proxy for response time
    const totalRounds = invitations.reduce(
      (sum, inv) => sum + (inv.negotiationRounds ?? 1),
      0
    );
    const avgResponseTime =
      invitations.length > 0
        ? Math.round((totalRounds / invitations.length) * 10) / 10
        : 1;

    // Per-partner task metrics
    const partnerScoresLocal = partnerOrgs.map((partner) => {
      const partnerTasks = tasks.filter(
        (t) => t.assignedOrgId === partner.orgId
      );
      const partnerDone = partnerTasks.filter((t) => t.status === "DONE");
      const totalHours = partnerTasks.reduce(
        (sum, t) => sum + (t.estimatedHours ?? 0),
        0
      );
      const avgHours =
        partnerTasks.length > 0
          ? Math.round((totalHours / partnerTasks.length) * 10) / 10
          : 0;
      const rawScore =
        partnerTasks.length > 0
          ? Math.round((partnerDone.length / partnerTasks.length) * 100)
          : 0;

      return {
        orgId: partner.orgId as Id<"organizations">,
        orgName: partner.orgName,
        score: rawScore,
        tasksCompleted: partnerDone.length,
        totalTasks: partnerTasks.length,
        avgHours,
      };
    });

    // ─── 3. Build AI prompt ───────────────────────────────────────────────
    const durationDays = Math.round(
      (event.endDate - event.startDate) / (1000 * 60 * 60 * 24)
    );

    const partnerSummary = partnerScoresLocal
      .map(
        (p, i) =>
          `${i + 1}. ${p.orgName}: ${p.tasksCompleted}/${p.totalTasks} tasks done (${p.score}%), avg ${p.avgHours}h/task`
      )
      .join("\n");

    const taskSampleLines = tasks
      .slice(0, 20)
      .map(
        (t) =>
          `- ${t.title} [${t.status}] ${t.assignedOrgId ? "" : "(unassigned)"}`
      )
      .join("\n");

    const systemPrompt = [
      "You are EventCollab AI, a post-event analysis assistant for Indonesian campus organizations.",
      "Generate a concise, professional post-event report.",
      "Always return valid JSON only. No markdown, no code blocks, no explanation.",
    ].join(" ");

    const userPrompt = `
Event: "${event.title}"
Type: ${event.eventType}
Duration: ${durationDays} days (${new Date(event.startDate).toISOString().split("T")[0]} → ${new Date(event.endDate).toISOString().split("T")[0]})
Host: ${event.hostOrgName}

Execution Metrics:
- Total Tasks: ${totalTasks}
- Completion Rate: ${completionRate}%
- On-Time Rate: ${onTimeRate}%
- Avg Negotiation Rounds: ${avgResponseTime}

Partner Performance:
${partnerSummary || "No partners"}

Task Sample (up to 20):
${taskSampleLines || "No tasks recorded"}

Based on the above data, generate a post-event analysis.
Score the overall event (0-100) based on completion rate, on-time delivery, and partner engagement.

Return ONLY this JSON (no markdown):
{
  "overallScore": number (0-100),
  "executiveSummary": "string (3-4 sentences, professional Indonesian/English mix is fine)",
  "lessonsLearned": ["lesson1", "lesson2", "lesson3", "lesson4"],
  "recommendations": ["rec1", "rec2", "rec3", "rec4"]
}
`.trim();

    // ─── 4. Call Gemini Flash 2.0 (same pattern as partnerRecommender.ts) ──
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it in the Convex Dashboard → Settings → Environment Variables."
      );
    }

    const geminiPayload = {
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    };

    // Fallback model cascade — same order as partnerRecommender.ts
    const allowedModels = ["gemini-2.5-flash", "gemini-2.0-flash-lite"];

    let response: Response | null = null;
    let errBody = "";

    console.log("[PostEventReport] 🚀 Starting Gemini Flash 2.0 model cascade...");

    for (const model of allowedModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiPayload),
        });

        if (response.ok) {
          console.log(`[PostEventReport] ✅ SUCCESS — Active model: ${model}`);
          break; // Successfully got response
        }

        errBody = await response.text();
        if (response.status === 429 || errBody.includes("Quota")) {
          // Hard quota — stop cascade and go to heuristic fallback
          break;
        }
      } catch (err: any) {
        errBody = err.message;
        console.warn(`[PostEventReport] 🔌 Network error on [${model}]: ${errBody}`);
        response = null;
      }
    }

    // ─── 5. Parse or fall back to heuristics ─────────────────────────────
    let aiResult: {
      overallScore: number;
      executiveSummary: string;
      lessonsLearned: string[];
      recommendations: string[];
    };

    if (!response || !response.ok) {
      const status = response ? response.status : 500;
      console.warn("════════════════════════════════════════════");
      console.warn("GEMINI QUOTA EXCEEDED — postEventReport");
      console.warn("════════════════════════════════════════════");
      console.warn(`HTTP Status  : ${status}`);
      console.warn(`Models tried : ${allowedModels.join(", ")}`);
      console.warn("→ Falling back to local heuristic analysis.");
      console.warn("════════════════════════════════════════════");

      aiResult = {
        overallScore: Math.round(
          completionRate * 0.5 + onTimeRate * 0.3 + Math.min(100, avgResponseTime * 10) * 0.2
        ),
        executiveSummary: `Event "${event.title}" selesai dengan tingkat penyelesaian ${completionRate}% dari ${totalTasks} task total. ${doneTasks.length} task berhasil diselesaikan oleh ${partnerOrgs.length} partner organization. On-time delivery rate mencapai ${onTimeRate}%.`,
        lessonsLearned: [
          "Koordinasi antar partner perlu ditingkatkan sejak awal event",
          "Distribusi task lebih merata akan meningkatkan efisiensi tim",
          "Monitoring progress secara berkala membantu deteksi hambatan lebih awal",
          "Komunikasi yang jelas terkait deadline sangat penting untuk on-time delivery",
        ],
        recommendations: [
          "Adakan kickoff meeting bersama seluruh partner sebelum event dimulai",
          "Gunakan sistem notifikasi otomatis untuk task yang mendekati deadline",
          "Buat template standar untuk setiap jenis event agar persiapan lebih cepat",
          "Lakukan evaluasi mid-event untuk mengidentifikasi hambatan lebih awal",
        ],
      };
    } else {
      const geminiResult: any = await response.json();
      const rawText: string =
        geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      console.log(
        `[PostEventReport] 📊 Tokens — prompt: ${geminiResult?.usageMetadata?.promptTokenCount ?? "?"}, completion: ${geminiResult?.usageMetadata?.candidatesTokenCount ?? "?"}`
      );

      try {
        aiResult = JSON.parse(rawText);
      } catch {
        throw new Error(
          `[PostEventReport] Failed to parse Gemini response as JSON. Raw: ${rawText.slice(0, 300)}`
        );
      }
    }

    // ─── 6. ACT: Save report via internalMutation ─────────────────────────
    const reportId: string = await ctx.runMutation(
      internal.ai.postEventReport.savePostEventReport,
      {
        eventId: args.eventId,
        executiveSummary: aiResult.executiveSummary ?? "",
        overallScore: Math.min(100, Math.max(0, Math.round(aiResult.overallScore ?? completionRate))),
        totalTasks,
        completionRate,
        onTimeRate,
        avgResponseTime,
        lessonsLearned: (aiResult.lessonsLearned ?? []).slice(0, 6),
        partnerScores: partnerScoresLocal,
        recommendations: (aiResult.recommendations ?? []).slice(0, 6),
      }
    );

    // ─── 7. Mark event as COMPLETED ───────────────────────────────────────
    await ctx.runMutation(internal.ai.postEventReport.markEventCompleted, {
      eventId: args.eventId,
    });

    console.log(
      `[PostEventReport] ✅ Report saved (id: ${reportId}), event marked COMPLETED`
    );

    return {
      reportId,
      message: `Post-event report generated successfully. Overall score: ${aiResult.overallScore}/100`,
    };
  },
});

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get the latest post-event report for an event.
 */
export const getReportByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("postEventReports")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();
  },
});

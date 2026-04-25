
import { internalAction, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// ── Internal Queries ──────────────────────────────────────────────────────────

/**
 * Fetch event details with accepted partnerships
 */
export const getEventContext = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    // Get all ACCEPTED partnerships with org details
    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const acceptedPartnerships = partnerships.filter(
      (p) => p.status === "ACCEPTED"
    );

    // Fetch org details for each partner
    const partnerDetailsPromises = acceptedPartnerships.map(async (p) => {
      const org = await ctx.db.get(p.partnerOrgId);
      return {
        _id: p.partnerOrgId.toString(),
        name: org?.name ?? "Unknown",
        role: p.role,
        capabilities: org?.capabilities ?? [],
      };
    });

    const partnerDetails = await Promise.all(partnerDetailsPromises);

    return {
      _id: event._id,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      startDate: event.startDate,
      endDate: event.endDate,
      requirements: event.requirements,
      partnerCriteria: event.partnerCriteria,
      hostOrgId: event.hostOrgId,
      partners: partnerDetails,
    };
  },
});

/**
 * Check if cached task breakdown exists and is valid
 */
export const getCachedTaskBreakdown = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("ai_cache")
      .withIndex("by_event_type", (q) =>
        q.eq("eventId", args.eventId).eq("type", "TASK_BREAKDOWN")
      )
      .first();

    if (!cached) return null;

    // TASK_BREAKDOWN has no expiry (permanent until event done)
    return {
      payload: cached.payload,
      generatedAt: cached.generatedAt,
    };
  },
});

/**
 * Internal mutation to save cache
 */
export const saveCachedTaskBreakdown = internalMutation({
  args: {
    eventId: v.id("events"),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    // Remove stale entry if it exists
    const existing = await ctx.db
      .query("ai_cache")
      .withIndex("by_event_type", (q) =>
        q.eq("eventId", args.eventId).eq("type", "TASK_BREAKDOWN")
      )
      .first();

    if (existing) await ctx.db.delete(existing._id);

    await ctx.db.insert("ai_cache", {
      type: "TASK_BREAKDOWN",
      eventId: args.eventId,
      payload: args.payload,
      generatedAt: Date.now(),
      // No expiry: expiresAt is optional and left undefined
    });
  },
});

/**
 * Internal mutation to insert tasks
 */
export const insertTasks = internalMutation({
  args: {
    eventId: v.id("events"),
    tasks: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      assignedOrgId: v.id("organizations"),
      estimatedHours: v.number(),
      dueDate: v.number(),
      phase: v.string(),
      priority: v.union(v.literal("HIGH"), v.literal("MED"), v.literal("LOW")),
      isCritical: v.boolean(),
      order: v.number(),
      aiRationale: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const insertedIds: string[] = [];
    for (const task of args.tasks) {
      const id = await ctx.db.insert("tasks", {
        ...task,
        status: "TODO",
        isAiGenerated: true,
        eventId: args.eventId,
      });
      insertedIds.push(id.toString());
    }
    return insertedIds;
  },
});

/**
 * Internal mutation to insert task dependencies
 */
export const insertDependencies = internalMutation({
  args: {
    dependencies: v.array(v.object({
      taskId: v.string(),
      dependsOnTaskId: v.string(),
      dependencyType: v.union(v.literal("FINISH_TO_START"), v.literal("START_TO_START")),
    })),
  },
  handler: async (ctx, args) => {
    for (const dep of args.dependencies) {
      await ctx.db.insert("taskDependencies", {
        taskId: dep.taskId as any,
        dependsOnTaskId: dep.dependsOnTaskId as any,
        dependencyType: dep.dependencyType,
      });
    }
  },
});

// ── Main Action ───────────────────────────────────────────────────────────────

/**
 * Generate AI Task Breakdown
 * Orchestrator: perceive → reason → act
 *
 * 1. Check cache for existing TASK_BREAKDOWN
 * 2. Fetch event context + partnerships
 * 3. Call Gemini Flash 2.0 with structured prompt
 * 4. Parse and validate JSON response
 * 5. Batch insert tasks and dependencies
 * 6. Cache result permanently
 * 7. Return inserted task IDs
 */
export const generateTaskBreakdown = internalAction({
  args: {
    eventId: v.id("events"),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    taskIds: string[];
    phaseCount: number;
    taskCount: number;
    fromCache: boolean;
    generatedAt: number;
    message?: string;
  }> => {
    // ─── 1. Cache check ───────────────────────────────────────────────────
    if (!args.forceRefresh) {
      const cached = await ctx.runQuery(
        internal.ai.taskBreakdown.getCachedTaskBreakdown,
        { eventId: args.eventId }
      );

      if (cached) {
        const cachedTasks = JSON.parse(cached.payload);
        return {
          taskIds: cachedTasks.map((t: any) => t._id),
          phaseCount: cachedTasks.length > 0 ? new Set(cachedTasks.map((t: any) => t.phase)).size : 0,
          taskCount: cachedTasks.length,
          fromCache: true,
          generatedAt: cached.generatedAt,
          message: "AI Task Breakdown retrieved from cache",
        };
      }
    }

    // ─── 2. Perceive: gather context ──────────────────────────────────────
    const event = await ctx.runQuery(
      internal.ai.taskBreakdown.getEventContext,
      { eventId: args.eventId }
    );

    if (!event) throw new Error("Event not found");

    if ((event.partners ?? []).length === 0) {
      return {
        taskIds: [],
        phaseCount: 0,
        taskCount: 0,
        fromCache: false,
        generatedAt: Date.now(),
        message: "No accepted partners yet. Generate tasks after invitations are accepted.",
      };
    }

    // ─── 3. Build prompt ──────────────────────────────────────────────────
    const partnersList = event.partners
      .map(
        (p: any, i: number) =>
          `${i + 1}. "${p.name}" (Role: ${p.role}) — Capabilities: [${p.capabilities.join(", ")}]`
      )
      .join("\n");

    const systemPrompt = [
      "You are EventCollab AI, a campus event project planning assistant.",
      "Generate a detailed Work Breakdown Structure for collaborative campus events.",
      "Always return valid JSON only. No markdown, no code blocks, no explanation.",
      "Context: Indonesian campus organizations collaborating on events.",
    ].join(" ");

    const userPrompt = `
Event: "${event.title}"
Type: ${event.eventType}
Date: ${new Date(event.startDate).toISOString().split("T")[0]} to ${new Date(event.endDate).toISOString().split("T")[0]}
Description: ${event.description}
Requirements: [${event.requirements.join(", ")}]

Partner Organizations:
${partnersList}

Generate a Work Breakdown Structure with 3-4 phases and 4-6 tasks per phase.
Assign each task to the most capable organization based on their role and capabilities.
Estimate realistic hours for college student volunteers (5-20 hours typical).
Set dueDateOffsetDays relative to event endDate (0 = event end, positive = before event).

Return ONLY this JSON structure (no markdown):
{
  "phases": [
    {
      "name": "string (phase name)",
      "tasks": [
        {
          "title": "string (task name)",
          "description": "string (what needs to be done)",
          "assignedOrgId": "string (exact partner name from list above)",
          "estimatedHours": number (5-30 range typical),
          "dueDateOffsetDays": number (positive = before event ends),
          "priority": "HIGH" | "MED" | "LOW",
          "isCritical": boolean (true if event depends on this task),
          "dependencies": ["task_title_1", "task_title_2"],
          "rationale": "string (max 100 chars, why this org)"
        }
      ]
    }
  ]
}

IMPORTANT:
- ALL assignedOrgId must be EXACT partner names from the list above
- Dependencies refer to task titles, not indices
- Estimate conservatively for volunteer labor
- Mark as HIGH priority only for critical path tasks
- Return valid JSON only.
`.trim();

    // ─── 4. Call Mistral AI ───────────────────────────────────────────────
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error(
        "MISTRAL_API_KEY is not set. Add it to Convex Dashboard → Settings → Environment Variables."
      );
    }

    const mistralPayload = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4096,
    };

    const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

    // ── Model Cascade (free tier models, best for agentic AI) ────────────
    // mistral-small-latest → Best quality on free tier, fast & capable
    // open-mistral-nemo    → Multilingual 12B, open-weight fallback
    // open-mistral-7b      → Lightweight last-resort fallback
    const allowedModels = [
      "-small-latestmistral",
      "open-mistral-nemo",
      "open-mistral-7b",
    ];

    let response: Response | null = null;
    let errBody = "";
    let activeModel = "";

    console.log("[TaskBreakdown] 🚀 Starting Mistral AI model cascade...");

    for (const model of allowedModels) {
      console.log(`[TaskBreakdown] 🔄 Trying model: ${model}`);
      try {
        response = await fetch(MISTRAL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ ...mistralPayload, model }),
        });

        if (response.ok) {
          activeModel = model;
          console.log(`[TaskBreakdown] ✅ SUCCESS — Active model: ${model}`);
          break;
        }

        errBody = await response.text();
        console.warn(
          `[TaskBreakdown] ⚠️  Model [${model}] failed` +
          ` | HTTP ${response.status}` +
          ` | ${errBody.slice(0, 200)}`
        );

        if (response.status === 429 || errBody.includes("rate_limit") || errBody.includes("Rate limit")) {
          console.warn(`[TaskBreakdown] 🚫 RATE LIMITED on [${model}] — switching to next model...`);
          response = null;
          continue;
        }
        // Non-quota error: stop cascade
        break;
      } catch (err: any) {
        errBody = err.message;
        console.warn(`[TaskBreakdown] 🔌 Network error on [${model}]: ${errBody}`);
        response = null;
      }
    }

    if (!response || !response.ok) {
      errBody = errBody || "Unknown network error or all models failed.";
      const status = response ? response.status : 500;

      if (status === 429 || errBody.includes("rate_limit") || response === null) {
        console.warn(
          "[TaskBreakdown] 🔴 ALL MISTRAL MODELS RATE LIMITED — falling back to local template." +
          " Models tried: " + allowedModels.join(" → ")
        );
        
        const fallbackTasks = event.partners.flatMap((partner: any) => [
          {
            title: `Persiapan awal - ${partner.name}`,
            description: `Task persiapan untuk ${partner.name} sebagai ${partner.role}`,
            assignedOrgId: partner._id,
            estimatedHours: 8,
            dueDate: event.endDate - 7 * 24 * 60 * 60 * 1000,
            phase: "Persiapan",
            priority: "HIGH" as const,
            isCritical: true,
            order: 0,
            aiRationale: `${partner.name} bertanggung jawab sebagai ${partner.role}`,
          },
          {
            title: `Pelaksanaan - ${partner.name}`,
            description: `Task pelaksanaan untuk ${partner.name}`,
            assignedOrgId: partner._id,
            estimatedHours: 12,
            dueDate: event.endDate - 1 * 24 * 60 * 60 * 1000,
            phase: "Pelaksanaan",
            priority: "MED" as const,
            isCritical: false,
            order: 1,
            aiRationale: `Sesuai capabilities ${partner.capabilities?.join(", ")}`,
          },
        ]);

        const realTaskIds = await ctx.runMutation(
          internal.ai.taskBreakdown.insertTasks,
          { eventId: args.eventId, tasks: fallbackTasks }
        );

        return {
          taskIds: realTaskIds,
          phaseCount: 2,
          taskCount: fallbackTasks.length,
          fromCache: false,
          generatedAt: Date.now(),
          message: "⚠️ Semua model Mistral AI sedang rate limited. Tasks dibuat dari template lokal.",
        };
      }

      console.error(
        `[TaskBreakdown] ❌ FATAL — All models failed | Last HTTP status: ${status}` +
        ` | Models tried: ${allowedModels.join(" → ")}` +
        ` | Last error: ${errBody.slice(0, 200)}`
      );
      throw new Error(`Mistral API error ${status}: ${errBody.slice(0, 300)}`);
    }

    const mistralResult: any = await response.json();
    const rawText: string = mistralResult?.choices?.[0]?.message?.content ?? "";

    console.log(`[TaskBreakdown] 📊 Tokens used — prompt: ${mistralResult?.usage?.prompt_tokens ?? "?"},` +
      ` completion: ${mistralResult?.usage?.completion_tokens ?? "?"},` +
      ` total: ${mistralResult?.usage?.total_tokens ?? "?"} | model: ${activeModel}`);

    // ─── 5. Parse and validate JSON ────────────────────────────────────────
    let parsed: { phases: any[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(
        `[TaskBreakdown] Failed to parse Mistral response as JSON (model: ${activeModel}). Raw: ` + rawText.slice(0, 300)
      );
    }

    if (!Array.isArray(parsed.phases)) {
      throw new Error(`[TaskBreakdown] Mistral (${activeModel}) returned unexpected shape — missing phases array.`);
    }

    // ─── 6. Build task inserts with dependency tracking ──────────────────
    const taskIdMap: Record<string, string> = {}; // title → _id
    const insertedTasks: any[] = [];
    const dependencies: Array<{ taskId: string; dependsOnTaskId: string; dependencyType: string; depTitle: string }> = [];

    // First pass: collect task titles for dependency resolution
    const titleToOrgMap: Record<string, string> = {};
    parsed.phases.forEach((phase) => {
      phase.tasks?.forEach((task: any) => {
        titleToOrgMap[task.title] = task.assignedOrgId;
      });
    });

    // Second pass: insert tasks and collect dependencies
    let globalOrder = 0;
    for (const phase of parsed.phases) {
      for (const task of phase.tasks || []) {
        // Resolve assignedOrgId: find partner with matching name
        const assignedOrgId = event.partners.find(
          (p: any) => p.name === task.assignedOrgId
        )?._id;

        if (!assignedOrgId) {
          console.warn(
            `Task "${task.title}" assigned to unknown org "${task.assignedOrgId}". Skipping.`
          );
          continue;
        }

        // Create task
        const taskData = {
          title: task.title,
          description: task.description,
          assignedOrgId: assignedOrgId,
          estimatedHours: task.estimatedHours ?? 10,
          dueDate:
            event.endDate - (task.dueDateOffsetDays ?? 0) * 24 * 60 * 60 * 1000,
          phase: phase.name,
          priority: task.priority ?? "MED",
          isCritical: task.isCritical ?? false,
          order: globalOrder,
          aiRationale: task.rationale ?? "",
        };

        const tempId = `temp_${globalOrder}`;
        taskIdMap[task.title] = tempId;
        insertedTasks.push({
          ...taskData,
          _id: tempId,
        });

        // Collect dependencies (to process after all tasks inserted)
        if (task.dependencies && Array.isArray(task.dependencies)) {
          task.dependencies.forEach((depTitle: string) => {
            dependencies.push({
              taskId: tempId,
              dependsOnTaskId: "", // Will resolve in next pass
              dependencyType: "FINISH_TO_START",
              depTitle, // Temporary tracking, not part of schema
            });
          });
        }

        globalOrder++;
      }
    }

    // ─── 7. Insert tasks via internal mutation ────────────────────────────
    const realTaskIds = await ctx.runMutation(
      internal.ai.taskBreakdown.insertTasks,
      {
        eventId: args.eventId,
        tasks: insertedTasks.map((t) => ({
          title: t.title,
          description: t.description,
          assignedOrgId: t.assignedOrgId as any,
          estimatedHours: t.estimatedHours,
          dueDate: t.dueDate,
          phase: t.phase,
          priority: t.priority,
          isCritical: t.isCritical,
          order: t.order,
          aiRationale: t.aiRationale,
        })),
      }
    );

    // Update temp IDs to real IDs
    const tempToRealMap: Record<string, string> = {};
    insertedTasks.forEach((t, i) => {
      tempToRealMap[t._id] = realTaskIds[i];
    });

    // ─── 8. Insert task dependencies ──────────────────────────────────────
    const validDependencies: Array<{ taskId: string; dependsOnTaskId: string; dependencyType: "FINISH_TO_START" | "START_TO_START" }> = [];
    for (const dep of dependencies as any[]) {
      const dependsOnId = taskIdMap[dep.depTitle];
      const realDependsOnId = tempToRealMap[dependsOnId];
      const realTaskId = tempToRealMap[dep.taskId];
      if (realDependsOnId && realTaskId) {
        validDependencies.push({
          taskId: realTaskId,
          dependsOnTaskId: realDependsOnId,
          dependencyType: dep.dependencyType as "FINISH_TO_START" | "START_TO_START",
        });
      }
    }

    if (validDependencies.length > 0) {
      await ctx.runMutation(
        internal.ai.taskBreakdown.insertDependencies,
        { dependencies: validDependencies }
      );
    }

    // ─── 9. Cache result (no expiry) ──────────────────────────────────────
    const taskDetailsForCache = insertedTasks.map((t, i) => ({
      ...t,
      _id: realTaskIds[i],
    }));

    await ctx.runMutation(
      internal.ai.taskBreakdown.saveCachedTaskBreakdown,
      {
        eventId: args.eventId,
        payload: JSON.stringify(taskDetailsForCache),
      }
    );

    // ─── 10. Return results ───────────────────────────────────────────────
    const phaseCount = new Set(insertedTasks.map((t) => t.phase)).size;

    return {
      taskIds: realTaskIds,
      phaseCount,
      taskCount: insertedTasks.length,
      fromCache: false,
      generatedAt: Date.now(),
      message: `Successfully generated ${insertedTasks.length} tasks in ${phaseCount} phases`,
    };
  },
});


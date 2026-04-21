import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, mutation, query } from "./_generated/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertEventHost(ctx: any, eventId: Id<"events">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user?.orgId) throw new Error("No organization found");

  const event = await ctx.db.get(eventId);
  if (!event) throw new Error("Event not found");
  if (event.hostOrgId !== user.orgId) {
    throw new Error("Only event host can manage tasks");
  }

  return { userId, orgId: user.orgId, event };
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Get all tasks for an event, grouped by phase
 */
export const getByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Fetch org names for each task
    const taskDetailsPromises = tasks.map(async (task) => {
      let assignedOrgName = "";
      if (task.assignedOrgId) {
        const org = await ctx.db.get(task.assignedOrgId);
        assignedOrgName = org?.name ?? "";
      }
      return {
        ...task,
        assignedOrgName,
      };
    });

    const taskDetails = await Promise.all(taskDetailsPromises);

    // Group by phase
    const grouped: Record<string, typeof taskDetails> = {};
    taskDetails.forEach((task) => {
      const phase = task.phase ?? "Uncategorized";
      if (!grouped[phase]) grouped[phase] = [];
      grouped[phase].push(task);
    });

    return grouped;
  },
});

/**
 * Get tasks with parent-child hierarchy for tree view
 */
export const getByEventHierarchical = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Fetch org names
    const taskDetailsPromises = tasks.map(async (task) => {
      let assignedOrgName = "";
      if (task.assignedOrgId) {
        const org = await ctx.db.get(task.assignedOrgId);
        assignedOrgName = org?.name ?? "";
      }
      return {
        ...task,
        assignedOrgName,
      };
    });

    const taskDetails = await Promise.all(taskDetailsPromises);

    // Build tree: root tasks (no parentTaskId) + their children
    const rootTasks = taskDetails.filter((t) => !t.parentTaskId);
    const childrenMap: Record<string, typeof taskDetails> = {};

    taskDetails.forEach((task) => {
      if (task.parentTaskId) {
        const parentId = task.parentTaskId.toString();
        if (!childrenMap[parentId]) childrenMap[parentId] = [];
        childrenMap[parentId].push(task);
      }
    });

    return {
      root: rootTasks,
      childrenMap,
    };
  },
});

/**
 * Get AI-generated tasks pending approval for an event
 */
export const getPendingApproval = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const pending = tasks.filter(
      (t) => t.isAiGenerated === true && t.status === "TODO"
    );

    // Fetch org names
    const taskDetailsPromises = pending.map(async (task) => {
      let assignedOrgName = "";
      if (task.assignedOrgId) {
        const org = await ctx.db.get(task.assignedOrgId);
        assignedOrgName = org?.name ?? "";
      }
      return {
        ...task,
        assignedOrgName,
      };
    });

    const taskDetails = await Promise.all(taskDetailsPromises);

    // Group by phase
    const grouped: Record<string, typeof taskDetails> = {};
    taskDetails.forEach((task) => {
      const phase = task.phase ?? "Uncategorized";
      if (!grouped[phase]) grouped[phase] = [];
      grouped[phase].push(task);
    });

    return grouped;
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

/**
 * Mark a single AI-generated task as approved
 */
export const approveTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    if (!task.isAiGenerated) throw new Error("Task is not AI-generated");

    // Set isAiGenerated to false so it shows in Kanban
    await ctx.db.patch(args.taskId, {
      isAiGenerated: false,
    });

    return args.taskId;
  },
});

/**
 * Bulk approve all AI-generated tasks for an event (for event host only)
 */
export const approveAllTasks = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const { orgId } = await assertEventHost(ctx, args.eventId);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const aiTasks = tasks.filter((t) => t.isAiGenerated === true);

    // Batch update
    const updatePromises = aiTasks.map((task) =>
      ctx.db.patch(task._id, { isAiGenerated: false })
    );

    await Promise.all(updatePromises);

    return { approvedCount: aiTasks.length };
  },
});

/**
 * Update an existing task (host can edit before or after approval)
 */
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    assignedOrgId: v.optional(v.id("organizations")),
    estimatedHours: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    priority: v.optional(
      v.union(v.literal("HIGH"), v.literal("MED"), v.literal("LOW"))
    ),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.orgId) throw new Error("No organization found");

    const event = await ctx.db.get(task.eventId);
    if (!event) throw new Error("Event not found");

    const isHost = event.hostOrgId === user.orgId;
    const isAssigned = task.assignedOrgId === user.orgId;

    if (!isHost && !isAssigned) {
      throw new Error("Not authorized to edit this task");
    }

    const updates: Record<string, any> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.assignedOrgId !== undefined) updates.assignedOrgId = args.assignedOrgId;
    if (args.estimatedHours !== undefined) updates.estimatedHours = args.estimatedHours;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.priority !== undefined) updates.priority = args.priority;

    await ctx.db.patch(args.taskId, updates);
    return args.taskId;
  },
});

/**
 * Delete a task (typically AI-generated tasks host doesn't want)
 */
export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Verify caller is event host
    await assertEventHost(ctx, task.eventId);

    // Delete associated dependencies
    const inbound = await ctx.db
      .query("taskDependencies")
      .withIndex("by_depends_on", (q) => q.eq("dependsOnTaskId", args.taskId))
      .collect();

    const outbound = await ctx.db
      .query("taskDependencies")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const depDeletePromises = [
      ...inbound.map((d) => ctx.db.delete(d._id)),
      ...outbound.map((d) => ctx.db.delete(d._id)),
    ];

    await Promise.all(depDeletePromises);

    // Delete task
    await ctx.db.delete(args.taskId);

    return args.taskId;
  },
});

/**
 * Create a manual task (host-created, not AI-generated)
 */
export const createManualTask = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    description: v.optional(v.string()),
    assignedOrgId: v.optional(v.id("organizations")),
    phase: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("HIGH"), v.literal("MED"), v.literal("LOW"))
    ),
    estimatedHours: v.optional(v.number()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify caller is event host
    await assertEventHost(ctx, args.eventId);

    const taskId = await ctx.db.insert("tasks", {
      eventId: args.eventId,
      title: args.title,
      description: args.description,
      status: "TODO",
      assignedOrgId: args.assignedOrgId,
      estimatedHours: args.estimatedHours,
      dueDate: args.dueDate,
      isAiGenerated: false,
      phase: args.phase,
      priority: args.priority,
    });

    return taskId;
  },
});

export const generateTaskBreakdown = action({
  args: {
    eventId: v.id("events"),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runAction(
      internal.ai.taskBreakdown.generateTaskBreakdown,
      args
    );
  },
});

/**
 * Get approved tasks for Kanban board, organized by status
 */
export const getKanbanByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Filter approved tasks only + enrich with org names
    const approvedTasks = await Promise.all(
      tasks
        .filter((t) => !t.isAiGenerated)
        .map(async (task) => {
          let assignedOrgName = "";
          if (task.assignedOrgId) {
            const org = await ctx.db.get(task.assignedOrgId);
            assignedOrgName = org?.name ?? "";
          }
          return { ...task, assignedOrgName };
        })
    );

    // Organize by status
    return {
      TODO: approvedTasks.filter((t) => t.status === "TODO"),
      IN_PROGRESS: approvedTasks.filter((t) => t.status === "IN_PROGRESS"),
      DONE: approvedTasks.filter((t) => t.status === "DONE"),
    };
  },
});

/**
 * Move task to new status (Kanban column change)
 */
export const moveTask = mutation({
  args: {
    taskId: v.id("tasks"),
    newStatus: v.union(
      v.literal("TODO"),
      v.literal("IN_PROGRESS"),
      v.literal("DONE")
    ),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Verify caller is event host or partner
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.orgId) throw new Error("No organization found");

    const event = await ctx.db.get(task.eventId);
    if (!event) throw new Error("Event not found");

    // Allow host and partners to move tasks
    const isHost = event.hostOrgId === user.orgId;
    const isAssigned = task.assignedOrgId === user.orgId;

    if (!isHost && !isAssigned) {
      throw new Error("Not authorized to move this task");
    }

    await ctx.db.patch(args.taskId, { status: args.newStatus });
    return args.taskId;
  },
});

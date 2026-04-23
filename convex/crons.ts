import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";

/**
 * Get all active events (PLANNING or EXECUTING)
 */
export const getActiveEvents = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allEvents = await ctx.db.query("events").collect();
    return allEvents.filter(
      (e) => e.status === "PLANNING" || e.status === "EXECUTING"
    );
  },
});

/**
 * Monitor all active events for progress every 6 hours
 */
export const monitorProgress = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    totalEvents: number;
    timestamp: number;
    message: string;
  }> => {
    console.log("[Cron] Progress monitoring started");

    // Query all PLANNING or EXECUTING events
    const activeEvents: any[] = await ctx.runQuery(internal.crons.getActiveEvents, {});

    console.log(`[Cron] Found ${activeEvents.length} active events to monitor`);

    // Schedule analysis for each event (non-blocking)
    for (const event of activeEvents) {
      try {
        // Schedule immediately but non-blocking
        await ctx.scheduler.runAfter(
          0,
          internal.ai.progressMonitor.generateProgressReport,
          { eventId: event._id }
        );
        console.log(`[Cron] Scheduled analysis for event: ${event.title}`);
      } catch (err: any) {
        console.error(
          `[Cron] Failed to schedule analysis for ${event.title}: ${err.message}`
        );
      }
    }

    return {
      totalEvents: activeEvents.length,
      timestamp: Date.now(),
      message: "Progress monitoring cycle completed",
    };
  },
});

const crons = cronJobs();

// Run every 6 hours
crons.interval(
  "progress-monitor",
  { hours: 6 },
  internal.crons.monitorProgress,
  {}
);

export default crons;

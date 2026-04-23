import { mutation } from "./_generated/server";

/**
 * Test recording alert feedback
 */
export const testRecordFeedback = mutation({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db
      .query("progressReports")
      .order("desc")
      .take(1);

    if (!reports.length) {
      throw new Error("No progress report found");
    }

    const report = reports[0];
    const user = await ctx.db.query("users").first();

    if (!user) {
      throw new Error("No user found");
    }

    // Record feedback for first alert
    const alert = report.alerts[0];
    if (!alert) {
      throw new Error("No alerts in report");
    }

    const feedbackId = await ctx.db.insert("alertFeedback", {
      progressReportId: report._id,
      alertId: alert.id,
      action: "ACKNOWLEDGED",
      reason: "Team is already working on it with additional resources",
      userId: user._id,
      timestamp: Date.now(),
    });

    return {
      feedbackId: feedbackId.toString(),
      alertId: alert.id,
      message: "Feedback recorded successfully",
    };
  },
});

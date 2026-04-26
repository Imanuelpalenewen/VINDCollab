import { action, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { callMistral } from "./_mistralClient";

// Internal Queries
export const getEventWithOrg = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    const hostOrg = await ctx.db.get(event.hostOrgId);
    return {
      _id: event._id,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      status: event.status,
      requirements: event.requirements,
      partnerCriteria: event.partnerCriteria,
      hostOrgId: event.hostOrgId,
      hostOrg: hostOrg ? { name: hostOrg.name, category: hostOrg.category } : null,
    };
  },
});

export const getAllCandidateOrgs = internalQuery({
  args: { excludeOrgId: v.id("organizations"), eventId: v.id("events") },
  handler: async (ctx, args) => {
    const allOrgs = await ctx.db.query("organizations").collect();
    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const invited = new Set(partnerships.map((p) => p.partnerOrgId.toString()));

    return allOrgs
      .filter((org) => org._id !== args.excludeOrgId && !invited.has(org._id.toString()))
      .map((org) => ({
        _id: org._id,
        name: org.name,
        category: org.category,
        capabilities: org.capabilities,
      }));
  },
});

export const getCachedRecommendation = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("ai_cache")
      .withIndex("by_event_type", (q) => q.eq("eventId", args.eventId).eq("type", "PARTNER_REC"))
      .first();
    if (!cached) return null;
    if (Date.now() - cached.generatedAt > 24 * 60 * 60 * 1000) return null;
    return { payload: cached.payload, generatedAt: cached.generatedAt };
  },
});

export const saveRecommendationCache = internalMutation({
  args: { eventId: v.id("events"), payload: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ai_cache")
      .withIndex("by_event_type", (q) => q.eq("eventId", args.eventId).eq("type", "PARTNER_REC"))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.insert("ai_cache", {
      type: "PARTNER_REC",
      eventId: args.eventId,
      payload: args.payload,
      generatedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  },
});

// Main Action
/**
 * Generate AI Partner Recommendations using Perceive → Reason → Act pipeline.
 */
export const generatePartnerRecommendations = action({
  args: { eventId: v.id("events"), forceRefresh: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    // 1. Cache check
    if (!args.forceRefresh) {
      const cached: any = await ctx.runQuery(internal.ai.partnerRecommender.getCachedRecommendation, { eventId: args.eventId });
      if (cached) {
        return { recommendations: JSON.parse(cached.payload), fromCache: true, generatedAt: cached.generatedAt };
      }
    }

    // 2. Perceive
    const event = await ctx.runQuery(internal.ai.partnerRecommender.getEventWithOrg, { eventId: args.eventId });
    if (!event) throw new Error("Event not found");

    const candidates = await ctx.runQuery(internal.ai.partnerRecommender.getAllCandidateOrgs, { excludeOrgId: event.hostOrgId, eventId: args.eventId });
    if (candidates.length === 0) {
      return { recommendations: [], fromCache: false, generatedAt: Date.now(), message: "No candidates found." };
    }

    const criteriaLower = new Set([...event.requirements.map((r: string) => r.toLowerCase()), ...event.partnerCriteria.map((c: string) => c.toLowerCase())]);
    const orgsToEvaluate: any[] = candidates;

    // 3. Prompt
    const orgListText = orgsToEvaluate.map((o: any, i: number) => `${i + 1}. "${o.name}" — Capabilities: [${o.capabilities.join(", ")}]`).join("\n");
    const systemPrompt = "You are VINDCollab AI. Rank organizations by suitability for the event. Return JSON only.";
    const userPrompt = `Event: "${event.title}". Requirements: [${event.requirements.join(", ")}]. Candidates:\n${orgListText}\nReturn JSON: {"recommendations": [{"orgIndex": 1, "score": 85, "matchedCapabilities": [], "reasoning": ""}]}`;

    // 4. Call Mistral AI
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY not set");

    const mistralResult = await callMistral(apiKey, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      logPrefix: "[PartnerRecommender]",
    });

    // 5. Fallback or Parse
    let recommendations: any[] = [];
    if (mistralResult.allRateLimited || !mistralResult.data) {
      console.warn("[PartnerRecommender] Falling back to local heuristic.");
      recommendations = orgsToEvaluate.map((org: any) => ({
        orgId: org._id.toString(),
        orgName: org.name,
        orgCategory: org.category,
        orgCapabilities: org.capabilities,
        score: 50,
        matchedCapabilities: [],
        reasoning: "Fallback match based on general profile.",
      }));
    } else {
      recommendations = mistralResult.data.recommendations.map((rec: any) => {
        const org = orgsToEvaluate[(rec.orgIndex || 1) - 1];
        if (!org) return null;
        return {
          orgId: org._id.toString(),
          orgName: org.name,
          orgCategory: org.category,
          orgCapabilities: org.capabilities,
          score: rec.score || 0,
          matchedCapabilities: rec.matchedCapabilities || [],
          reasoning: rec.reasoning || "",
        };
      }).filter((r: any) => r !== null);
    }

    recommendations.sort((a, b) => b.score - a.score);

    // 6. Cache
    await ctx.runMutation(internal.ai.partnerRecommender.saveRecommendationCache, { eventId: args.eventId, payload: JSON.stringify(recommendations) });

    return { recommendations, fromCache: false, generatedAt: Date.now() };
  },
});
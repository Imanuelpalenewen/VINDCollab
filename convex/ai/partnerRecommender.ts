import { action, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// ── Internal Queries (only callable from actions) ─────────────────────────────

/**
 * Fetch the event with its host organization info.
 */
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
      hostOrg: hostOrg
        ? { name: hostOrg.name, category: hostOrg.category }
        : null,
    };
  },
});

/**
 * Fetch all candidate organizations:
 * - Excludes the host organization
 * - Excludes orgs already invited/partnered for this event
 */
export const getAllCandidateOrgs = internalQuery({
  args: {
    excludeOrgId: v.id("organizations"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const allOrgs = await ctx.db.query("organizations").collect();

    // Already-invited org IDs
    const partnerships = await ctx.db
      .query("partnerships")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const invited = new Set(partnerships.map((p) => p.partnerOrgId.toString()));

    return allOrgs
      .filter(
        (org) =>
          org._id !== args.excludeOrgId &&
          !invited.has(org._id.toString()),
      )
      .map((org) => ({
        _id: org._id,
        name: org.name,
        category: org.category,
        capabilities: org.capabilities,
      }));
  },
});

/**
 * Look for a valid (< 24 h) cached recommendation for this event.
 */
export const getCachedRecommendation = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("ai_cache")
      .withIndex("by_event_type", (q) =>
        q.eq("eventId", args.eventId).eq("type", "PARTNER_REC"),
      )
      .first();

    if (!cached) return null;

    const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - cached.generatedAt > CACHE_TTL_MS) return null;

    return {
      payload: cached.payload,
      generatedAt: cached.generatedAt,
    };
  },
});

/**
 * Upsert the ai_cache entry for partner recommendations.
 */
export const saveRecommendationCache = internalMutation({
  args: {
    eventId: v.id("events"),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    // Remove stale entry if it exists
    const existing = await ctx.db
      .query("ai_cache")
      .withIndex("by_event_type", (q) =>
        q.eq("eventId", args.eventId).eq("type", "PARTNER_REC"),
      )
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

// ── Main Action ───────────────────────────────────────────────────────────────

/**
 * Agentic AI Partner Recommender
 *
 * Perceive → Reason → Act pipeline:
 *  1. Perceive: gather event requirements, partner criteria, candidate orgs
 *  2. Reason:   Mistral AI multi-criteria scoring with explanation
 *  3. Act:      return ranked list, cache for 24 h
 */
export const generatePartnerRecommendations = action({
  args: {
    eventId: v.id("events"),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    recommendations: Array<{
      orgId: string;
      orgName: string;
      orgCategory: string;
      orgCapabilities: string[];
      score: number;
      matchedCapabilities: string[];
      reasoning: string;
    }>;
    fromCache: boolean;
    generatedAt: number;
    message?: string;
  }> => {
    // ─── 1. Cache check ───────────────────────────────────────────────
    if (!args.forceRefresh) {
      const cached = await ctx.runQuery(
        internal.ai.partnerRecommender.getCachedRecommendation,
        { eventId: args.eventId },
      );
      if (cached) {
        return {
          recommendations: JSON.parse(cached.payload),
          fromCache: true,
          generatedAt: cached.generatedAt,
        };
      }
    }

    // ─── 2. Perceive: gather context ──────────────────────────────────
    const event = await ctx.runQuery(
      internal.ai.partnerRecommender.getEventWithOrg,
      { eventId: args.eventId },
    );
    if (!event) throw new Error("Event not found");

    const candidates = await ctx.runQuery(
      internal.ai.partnerRecommender.getAllCandidateOrgs,
      { excludeOrgId: event.hostOrgId, eventId: args.eventId },
    );

    if (candidates.length === 0) {
      return {
        recommendations: [],
        fromCache: false,
        generatedAt: Date.now(),
        message: "No candidate organizations available for recommendation.",
      };
    }

    // ─── 3. Pre-filter: keep orgs with ≥1 capability overlap ─────────
    const criteriaLower = new Set([
      ...event.requirements.map((r: string) => r.toLowerCase()),
      ...event.partnerCriteria.map((c: string) => c.toLowerCase()),
    ]);

    const preFiltered = candidates.filter((org) => {
      const caps = org.capabilities.map((c: string) => c.toLowerCase());
      return caps.some((cap: string) =>
        [...criteriaLower].some(
          (cr) =>
            cap.includes(cr) ||
            cr.includes(cap) ||
            cap
              .split(/\s+/)
              .some((word: string) =>
                [...criteriaLower].some((c) => c.includes(word) && word.length > 2),
              ),
        ),
      );
    });

    // If pre-filter removes everyone, fall back to all candidates
    const orgsToEvaluate = preFiltered.length > 0 ? preFiltered : candidates;

    // ─── 4. Reason: build prompt ──────────────────────────────────────
    const orgListText = orgsToEvaluate
      .map(
        (o, i) =>
          `${i + 1}. "${o.name}" (Category: ${o.category}) — Capabilities: [${o.capabilities.join(", ")}]`,
      )
      .join("\n");

    const systemPrompt = [
      "You are VINDCollab AI Partner Recommender, an agentic AI for campus event collaboration.",
      "Analyze event requirements against available organizations and rank them by suitability.",
      "Return ONLY valid JSON — no markdown, no extra text.",
    ].join(" ");

    const userPrompt = `
Event: "${event.title}"
Type: ${event.eventType}
Description: ${event.description}
Requirements: [${event.requirements.join(", ")}]
Partner Criteria: [${event.partnerCriteria.join(", ")}]
Host Organization: ${event.hostOrg?.name ?? "Unknown"} (${event.hostOrg?.category ?? ""})

Available Organizations:
${orgListText}

For EACH organization above, provide:
- orgIndex: the number from the list (1-indexed integer)
- score: 0-100 compatibility score based on how well capabilities match requirements & criteria
- matchedCapabilities: array of the org's capabilities that match event needs
- reasoning: 2-3 sentence explanation covering why this org would be a good (or poor) partner

Return JSON in this EXACT format:
{"recommendations": [{"orgIndex": 1, "score": 85, "matchedCapabilities": ["Design", "Marketing"], "reasoning": "This organization..."}]}

Rules:
- Include ALL organizations.
- Sort by score descending (best match first).
- Be generous but realistic with scoring.
- score >= 80 means excellent match, 50-79 good, below 50 partial/weak.
`.trim();

    // ─── 5. Call Mistral AI ───────────────────────────────────────────
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error(
        "MISTRAL_API_KEY is not set. Add it in the Convex Dashboard → Settings → Environment Variables.",
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

    // ── Model Cascade (free tier models, best for agentic AI) ─────────
    // mistral-small-latest → Best quality on free tier, fast & capable
    // open-mistral-nemo    → Multilingual 12B, open-weight fallback
    // open-mistral-7b      → Lightweight last-resort fallback
    const allowedModels = [
      "mistral-small-latest",
      "open-mistral-nemo",
      "open-mistral-7b",
    ];

    let response: Response | null = null;
    let errBody = "";
    let activeModel = "";

    console.log("[PartnerRecommender] 🚀 Starting Mistral AI model cascade...");

    for (const model of allowedModels) {
      console.log(`[PartnerRecommender] 🔄 Trying model: ${model}`);
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
          console.log(`[PartnerRecommender] ✅ SUCCESS — Active model: ${model}`);
          break;
        }

        errBody = await response.text();
        console.warn(
          `[PartnerRecommender] ⚠️  Model [${model}] failed` +
            ` | HTTP ${response.status}` +
            ` | ${errBody.slice(0, 200)}`,
        );

        if (
          response.status === 429 ||
          errBody.includes("rate_limit") ||
          errBody.includes("Rate limit")
        ) {
          console.warn(
            `[PartnerRecommender] 🚫 RATE LIMITED on [${model}] — switching to next model...`,
          );
          response = null;
          continue;
        }
        // Non-quota error: stop cascade
        break;
      } catch (err: any) {
        errBody = err.message;
        console.warn(`[PartnerRecommender] 🔌 Network error on [${model}]: ${errBody}`);
        response = null;
      }
    }

    // ─── 6. Handle failure: fallback to local heuristic ──────────────
    if (!response || !response.ok) {
      errBody = errBody || "Unknown network error or all models failed.";
      const status = response ? response.status : 500;

      if (
        status === 429 ||
        errBody.includes("rate_limit") ||
        response === null
      ) {
        console.warn(
          "[PartnerRecommender] 🔴 ALL MISTRAL MODELS RATE LIMITED — falling back to local heuristic." +
            " Models tried: " +
            allowedModels.join(" → "),
        );

        const fallbackRecs = orgsToEvaluate
          .map((org) => {
            let score = 40 + Math.floor(Math.random() * 20);
            const matchedCaps: string[] = [];

            org.capabilities.forEach((cap: string) => {
              const capL = cap.toLowerCase();
              if (
                [...criteriaLower].some(
                  (cr) =>
                    capL.includes(cr) ||
                    cr.includes(capL) ||
                    (cr.length > 3 && capL.includes(cr.slice(0, 4))),
                )
              ) {
                score += 15;
                matchedCaps.push(cap);
              }
            });

            score = Math.min(100, score);

            let reasoning = "";
            if (score >= 80)
              reasoning = `Excellent match! They provide ${matchedCaps.join(", ")} which fits the event perfectly. (Auto-generated fallback reasoning)`;
            else if (score >= 50)
              reasoning = `Good option. They offer ${matchedCaps[0] ?? "general support"} which aligns with your criteria. (Auto-generated fallback reasoning)`;
            else
              reasoning =
                "Partial match. They can assist in secondary areas. (Auto-generated fallback reasoning)";

            return {
              orgId: org._id.toString(),
              orgName: org.name,
              orgCategory: org.category,
              orgCapabilities: org.capabilities,
              score,
              matchedCapabilities: matchedCaps,
              reasoning,
            };
          })
          .sort((a, b) => b.score - a.score);

        return {
          recommendations: fallbackRecs,
          fromCache: false,
          generatedAt: Date.now(),
          message:
            "⚠️ Semua model Mistral AI sedang rate limited. Rekomendasi dibuat dari algoritma lokal berdasarkan kecocokan capabilities.",
        };
      }

      console.error(
        `[PartnerRecommender] ❌ FATAL — All models failed | Last HTTP status: ${status}` +
          ` | Models tried: ${allowedModels.join(" → ")}` +
          ` | Last error: ${errBody.slice(0, 200)}`,
      );
      throw new Error(`Mistral API error ${status}: ${errBody.slice(0, 300)}`);
    }

    // ─── 7. Parse AI output ───────────────────────────────────────────
    const mistralResult: any = await response.json();
    const rawText: string =
      mistralResult?.choices?.[0]?.message?.content ?? "";

    console.log(
      `[PartnerRecommender] 📊 Tokens used — prompt: ${mistralResult?.usage?.prompt_tokens ?? "?"},` +
        ` completion: ${mistralResult?.usage?.completion_tokens ?? "?"},` +
        ` total: ${mistralResult?.usage?.total_tokens ?? "?"} | model: ${activeModel}`,
    );

    let parsed: { recommendations: any[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(
        `[PartnerRecommender] Failed to parse Mistral response as JSON (model: ${activeModel}). Raw output: ` +
          rawText.slice(0, 300),
      );
    }

    if (!Array.isArray(parsed.recommendations)) {
      throw new Error(
        `[PartnerRecommender] Mistral (${activeModel}) returned unexpected shape — missing recommendations array.`,
      );
    }

    // ─── 8. Act: map indices → real org data ──────────────────────────
    const recommendations = parsed.recommendations
      .map((rec: any) => {
        const idx = (rec.orgIndex ?? 1) - 1;
        const org = orgsToEvaluate[idx];
        if (!org) return null;
        return {
          orgId: org._id.toString(),
          orgName: org.name,
          orgCategory: org.category,
          orgCapabilities: org.capabilities,
          score: Math.min(100, Math.max(0, Math.round(rec.score ?? 0))),
          matchedCapabilities: Array.isArray(rec.matchedCapabilities)
            ? rec.matchedCapabilities
            : [],
          reasoning: String(rec.reasoning ?? ""),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      // Ensure sorted by score descending
      .sort((a: any, b: any) => b.score - a.score);

    // ─── 9. Cache result ──────────────────────────────────────────────
    await ctx.runMutation(
      internal.ai.partnerRecommender.saveRecommendationCache,
      {
        eventId: args.eventId,
        payload: JSON.stringify(recommendations),
      },
    );

    return {
      recommendations,
      fromCache: false,
      generatedAt: Date.now(),
    };
  },
});
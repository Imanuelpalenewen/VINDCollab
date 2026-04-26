/**
 * Shared Mistral AI client with automatic model cascade.
 * Used by all AI modules (partnerRecommender, taskBreakdown,
 * progressMonitor, postEventReport).
 */

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

// Model priority order: best -> fallback -> last-resort
// mistral-small-latest  : Primary free tier model, best for agentic tasks
// open-mistral-nemo     : Nemo 12B multilingual, first fallback
// ministral-8b-latest   : Ministral 8B, last-resort fallback (replaces legacy open-mistral-7b)
export const MISTRAL_CASCADE_MODELS = [
  "mistral-small-latest",
  "open-mistral-nemo",
  "ministral-8b-latest",
];

export interface MistralMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MistralCallOptions {
  messages: MistralMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Prefix for logs, e.g.: "[PartnerRecommender]" */
  logPrefix: string;
}

export interface MistralCallResult {
  /** Parsed JSON from Mistral response */
  data: any;
  /** The model that successfully returned a response */
  activeModel: string;
  /** True if all models were rate-limited and fallback to heuristic is needed */
  allRateLimited: boolean;
}

/**
 * Call Mistral API with automatic model cascade.
 *
 * Flow:
 * 1. Try the first model (mistral-small-latest)
 * 2. If rate-limited (429), move to the next model
 * 3. If non-rate-limit error occurs, stop the cascade and throw an error
 * 4. If all models fail due to rate limits, return allRateLimited: true
 *
 * @throws Error if there's a non-rate-limit failure or API key is not found
 */
export async function callMistral(
  apiKey: string,
  options: MistralCallOptions
): Promise<MistralCallResult> {
  const { messages, temperature = 0.3, maxTokens = 4096, logPrefix } = options;

  const payload = {
    messages,
    response_format: { type: "json_object" },
    temperature,
    max_tokens: maxTokens,
  };

  let response: Response | null = null;
  let errBody = "";
  let activeModel = "";

  console.log(`${logPrefix} Starting Mistral AI model cascade...`);

  for (const model of MISTRAL_CASCADE_MODELS) {
    console.log(`${logPrefix} Trying model: ${model}`);
    try {
      response = await fetch(MISTRAL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...payload, model }),
      });

      if (response.ok) {
        activeModel = model;
        console.log(`${logPrefix} Success with model: ${model}`);
        break;
      }

      errBody = await response.text();
      console.warn(
        `${logPrefix} Model [${model}] failed | HTTP ${response.status} | ${errBody.slice(0, 200)}`
      );

      // If rate-limited, try the next model
      const isRateLimited =
        response.status === 429 ||
        errBody.includes("rate_limit") ||
        errBody.includes("Rate limit");

      if (isRateLimited) {
        console.warn(`${logPrefix} Rate limited on [${model}] - switching to next model...`);
        response = null;
        continue;
      }

      // Non-rate-limit error: stop the cascade
      break;
    } catch (err: any) {
      errBody = err.message;
      console.warn(`${logPrefix} Network error pada [${model}]: ${errBody}`);
      response = null;
    }
  }

  // All models rate-limited
  if (!response || !response.ok) {
    const status = response ? response.status : 500;
    const isAllRateLimited =
      status === 429 || errBody.includes("rate_limit") || response === null;

    if (isAllRateLimited) {
      console.warn(
        `${logPrefix} All Mistral models are rate limited. Models tried: ${MISTRAL_CASCADE_MODELS.join(" -> ")}`
      );
      return { data: null, activeModel: "", allRateLimited: true };
    }

    // Fatal error
    console.error(
      `${logPrefix} All models failed | HTTP: ${status} | Error: ${errBody.slice(0, 200)}`
    );
    throw new Error(`Mistral API error ${status}: ${errBody.slice(0, 300)}`);
  }

  // Parse response
  const mistralResult: any = await response.json();
  const rawText: string = mistralResult?.choices?.[0]?.message?.content ?? "";

  console.log(
    `${logPrefix} Tokens used - prompt: ${mistralResult?.usage?.prompt_tokens ?? "?"}, ` +
      `completion: ${mistralResult?.usage?.completion_tokens ?? "?"}, ` +
      `total: ${mistralResult?.usage?.total_tokens ?? "?"} | model: ${activeModel}`
  );

  let parsedData: any;
  try {
    parsedData = JSON.parse(rawText);
  } catch {
    throw new Error(
      `${logPrefix} Failed to parse Mistral response as JSON (model: ${activeModel}). Output: ${rawText.slice(0, 300)}`
    );
  }

  return { data: parsedData, activeModel, allRateLimited: false };
}

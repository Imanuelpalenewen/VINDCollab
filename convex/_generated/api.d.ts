/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_partnerRecommender from "../ai/partnerRecommender.js";
import type * as ai_postEventReport from "../ai/postEventReport.js";
import type * as ai_progressMonitor from "../ai/progressMonitor.js";
import type * as ai_taskBreakdown from "../ai/taskBreakdown.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as notifications from "../notifications.js";
import type * as organizations from "../organizations.js";
import type * as partnerships from "../partnerships.js";
import type * as reports from "../reports.js";
import type * as seed from "../seed.js";
import type * as tasks from "../tasks.js";
import type * as test from "../test.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/partnerRecommender": typeof ai_partnerRecommender;
  "ai/postEventReport": typeof ai_postEventReport;
  "ai/progressMonitor": typeof ai_progressMonitor;
  "ai/taskBreakdown": typeof ai_taskBreakdown;
  auth: typeof auth;
  chat: typeof chat;
  crons: typeof crons;
  events: typeof events;
  http: typeof http;
  invitations: typeof invitations;
  notifications: typeof notifications;
  organizations: typeof organizations;
  partnerships: typeof partnerships;
  reports: typeof reports;
  seed: typeof seed;
  tasks: typeof tasks;
  test: typeof test;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

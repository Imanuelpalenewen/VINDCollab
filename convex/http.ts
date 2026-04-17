import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Register all @convex-dev/auth HTTP endpoints
// (sign-in, sign-up, sign-out, session refresh, etc.)
auth.addHttpRoutes(http);

export default http;

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Single source of truth for authentication state across the app.
 * Combines the Convex auth session with the user's profile from our users table.
 */
export function useAuth() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  // Only fetch user profile when authenticated; "skip" avoids an unauthenticated query
  const user = useQuery(api.users.getMe, isAuthenticated ? {} : "skip");

  // Treat as "loading" while auth resolves OR while the user profile is being fetched
  const isLoading = authLoading || (isAuthenticated && user === undefined);

  return {
    isAuthenticated,
    isLoading,
    user: user ?? null,
    hasOrg: !!(user?.orgId),
  };
}

import { Redirect } from "expo-router";

/**
 * The org profile has been moved to the root Stack at /org-profile.
 * This redirect ensures any stale links to /(tabs)/profile still work.
 */
export default function ProfileRedirect() {
  return <Redirect href="/org-profile" />;
}

import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

/** SecureStore adapter for persisting auth session token on-device */
const secureStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Ignore storage write failures in restricted browser modes.
      }
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore storage remove failures in restricted browser modes.
      }
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

/**
 * Auth guard — segment-aware redirect logic.
 * Runs after every auth state change; decides which route group is appropriate.
 */
function AuthGuard() {
  const { isAuthenticated, isLoading, hasOrg } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait until auth + user profile are resolved

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    const onOnboarding = inAuthGroup && segments[1] === "onboarding";

    // Root-level stack screens that authenticated + onboarded users may visit
    const ALLOWED_ROOT_SCREENS = ["org-profile", "events", "invitations", "chat", "rooms", "partners", "notifications"];
    const inAllowedRoot = ALLOWED_ROOT_SCREENS.includes(segments[0] ?? "");

    if (!isAuthenticated) {
      // No session → force to login
      if (!inAuthGroup) router.replace("/(auth)/login");
    } else if (!hasOrg) {
      // Authenticated but no org → force to onboarding
      if (!onOnboarding) router.replace("/(auth)/onboarding");
    } else {
      // Fully onboarded → only redirect if not in the main app OR an allowed root screen
      if (!inTabsGroup && !inAllowedRoot) router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, hasOrg, segments]);


  return null; // Pure side-effect component
}

/**
 * Root layout — wraps everything with Convex providers.
 * AuthGuard handles all navigation protection reactively.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexAuthProvider client={convex} storage={secureStorage}>
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="org-profile" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="events/create" options={{ headerShown: false, animation: "slide_from_bottom" }} />
          <Stack.Screen name="events/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="events/partners" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="invitations/send" options={{ headerShown: false, animation: "slide_from_bottom" }} />
          <Stack.Screen name="invitations/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="invitations/counter-propose" options={{ headerShown: false, animation: "slide_from_bottom" }} />
          <Stack.Screen name="invitations/inbox" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="chat/[eventId]" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="rooms" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="partners" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="notifications" options={{ headerShown: false, animation: "slide_from_right" }} />
        </Stack>
      </ConvexAuthProvider>
    </GestureHandlerRootView>
  );
}


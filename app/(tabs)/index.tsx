import { View, Text, TouchableOpacity, Image, StyleSheet, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/Colors";

const AVATAR_PALETTE = ["#3B82F6", "#8B5CF6", "#EF4444", "#10B981", "#F59E0B", "#06B6D4"];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/**
 * Home / Dashboard screen — placeholder until Session 3 (Event Listing).
 * Sign-out has been moved to the More tab.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const org = useQuery(api.organizations.getMyOrg);

  const avatarColor = getAvatarColor(org?.name ?? user?.name ?? "?");
  const initials = getInitials(org?.name ?? user?.name ?? "?");

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      <View style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.name}>{user?.name ?? "—"}</Text>
            <Text style={styles.email}>{user?.email ?? ""}</Text>
          </View>

          {/* Avatar button — opens org profile */}
          <TouchableOpacity
            style={[styles.avatarBtn, { borderColor: avatarColor + "55" }]}
            onPress={() => router.push("/org-profile")}
            activeOpacity={0.8}
          >
            {org?.logoUrl ? (
              <Image
                source={{ uri: org.logoUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarInner, { backgroundColor: avatarColor + "22" }]}>
                <Text style={[styles.avatarInitials, { color: avatarColor }]}>
                  {initials}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          {[
            { label: "My Events", value: "0", icon: "calendar-outline" },
            { label: "Partners", value: "0", icon: "people-outline" },
            { label: "Tasks", value: "0", icon: "checkmark-circle-outline" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={20} color={Colors.PRIMARY} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Placeholder ── */}
        <View style={styles.placeholder}>
          <Ionicons name="construct-outline" size={40} color={Colors.TEXT_MUTED} />
          <Text style={styles.placeholderTitle}>Event Listing</Text>
          <Text style={styles.placeholderText}>
            Coming in Session 3 — Event creation wizard & listing
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  greeting: { fontSize: 14, color: Colors.TEXT_MUTED, marginBottom: 2 },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  email: { fontSize: 12, color: Colors.TEXT_SECONDARY, marginTop: 2 },

  // Avatar button (top-right)
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitials: { fontSize: 17, fontWeight: "800" },

  // Stats
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: Colors.TEXT_PRIMARY },
  statLabel: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    fontWeight: "600",
    textAlign: "center",
  },

  // Placeholder
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT_SECONDARY,
  },
  placeholderText: {
    color: Colors.TEXT_MUTED,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
});

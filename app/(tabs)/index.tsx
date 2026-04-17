import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/Colors";

/**
 * Home / Dashboard screen — placeholder until Session 3 (Event Listing).
 * Displays user info and a Sign Out button for auth testing.
 */
export default function HomeScreen() {
  const { signOut } = useAuthActions();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello 👋</Text>
          <Text style={styles.name}>{user?.name ?? "—"}</Text>
          <Text style={styles.email}>{user?.email ?? ""}</Text>
        </View>
        <TouchableOpacity style={styles.avatar}>
          <Ionicons name="person" size={22} color={Colors.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Dashboard placeholder cards */}
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

      <View style={styles.placeholder}>
        <Ionicons name="construct-outline" size={40} color={Colors.TEXT_MUTED} />
        <Text style={styles.placeholderText}>
          Event listing coming in Session 3
        </Text>
      </View>

      {/* Sign Out — for auth testing */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={() => signOut()}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={18} color={Colors.ERROR} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  greeting: {
    fontSize: 14,
    color: Colors.TEXT_MUTED,
    marginBottom: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
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
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    fontWeight: "600",
    textAlign: "center",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  placeholderText: {
    color: Colors.TEXT_MUTED,
    fontSize: 13,
    textAlign: "center",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    backgroundColor: "rgba(239, 68, 68, 0.07)",
  },
  signOutText: {
    color: Colors.ERROR,
    fontSize: 14,
    fontWeight: "600",
  },
});

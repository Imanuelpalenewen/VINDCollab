import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Image,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/Badge";
import { Colors } from "@/constants/Colors";

// ── Constants ─────────────────────────────────────────────────────────────────

const INVITE_VALIDITY_MINUTES = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getInviteStatus(createdAt?: number) {
  if (!createdAt) return null;
  const expiresAt = createdAt + INVITE_VALIDITY_MINUTES * 60 * 1000;
  const minutesLeft = Math.ceil((expiresAt - Date.now()) / (60 * 1000));
  return { expired: minutesLeft <= 0, minutesLeft: Math.max(0, minutesLeft), expiresAt };
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  hideChevron?: boolean;
}

function MenuRow({ icon, iconBg, iconColor, label, subtitle, onPress, danger, hideChevron }: MenuRowProps) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, danger && { color: Colors.ERROR }]}>{label}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      {!hideChevron && (
        <Ionicons name="chevron-forward" size={16} color={Colors.TEXT_MUTED} style={{ opacity: 0.5 }} />
      )}
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { user } = useAuth();
  const org = useQuery(api.organizations.getMyOrg);
  const stats = useQuery(api.organizations.getOrgStats);
  const generateCodeMutation = useMutation(api.organizations.generateNewInviteCode);

  const [regenerating, setRegenerating] = useState(false);

  const avatarColor = getAvatarColor(org?.name ?? user?.name ?? "?");
  const initials = getInitials(org?.name ?? user?.name ?? "?");
  const codeStatus = getInviteStatus(org?.inviteCodeCreatedAt);

  const handleComingSoon = (feature: string) =>
    Alert.alert(feature, "This feature will be available in a future session.", [{ text: "Got it" }]);

  const handleSignOut = () =>
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);

  const handleShare = () => {
    if (!org) return;
    Share.share({
      message: `Join ${org.name} on VINDCollab!\nInvite code: ${org.inviteCode}`,
      title: `${org.name} Invite`,
    });
  };

  const handleRegenerateCode = () =>
    Alert.alert(
      "Generate New Code?",
      "The current code will be invalidated and a fresh 15-minute code will be created.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: async () => {
            setRegenerating(true);
            try { await generateCodeMutation({}); }
            finally { setRegenerating(false); }
          },
        },
      ]
    );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>More</Text>

        {/* ── Profile hero card (tap → edit profile) ──── */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push("/org-profile")}
          activeOpacity={0.85}
        >
          <View style={[styles.avatarWrapper, { borderColor: avatarColor + "55" }]}>
            {org?.logoUrl ? (
              <Image source={{ uri: org.logoUrl }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={[styles.avatarInner, { backgroundColor: avatarColor + "22" }]}>
                <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.orgName} numberOfLines={1}>{org?.name ?? "Loading..."}</Text>
              <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>Host</Text></View>
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email ?? ""}</Text>
            {org?.category && <Badge label={org.category} variant="blue" style={{ marginTop: 6 }} />}
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.TEXT_MUTED} style={{ opacity: 0.45 }} />
        </TouchableOpacity>

        {/* ── Stats row ─────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { label: "Events\nHosted", value: stats?.eventCount ?? 0, color: "#93C5FD", bg: "rgba(59,130,246,0.10)" },
            { label: "Active\nPartners", value: stats?.partnerCount ?? 0, color: "#C4B5FD", bg: "rgba(139,92,246,0.10)" },
            { label: "Capabilities", value: org?.capabilities.length ?? 0, color: "#6EE7B7", bg: "rgba(16,185,129,0.10)" },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Capabilities ───────────────────────────────── */}
        {(org?.capabilities.length ?? 0) > 0 && (
          <>
            <Text style={styles.sectionLabel}>CAPABILITIES</Text>
            <View style={styles.capCard}>
              <View style={styles.chipGrid}>
                {org!.capabilities.map((cap) => (
                  <View key={cap} style={styles.capChip}>
                    <Ionicons name="checkmark-circle" size={11} color={Colors.SUCCESS} />
                    <Text style={styles.capChipText}>{cap}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── Invite Code ────────────────────────────────── */}
        <Text style={styles.sectionLabel}>INVITE CODE</Text>
        <View style={styles.inviteCard}>
          {/* Code display */}
          <View style={[styles.codeBox, codeStatus?.expired && styles.codeBoxExpired]}>
            <Text style={[styles.codeText, codeStatus?.expired && { color: Colors.ERROR }]}>
              {org?.inviteCode ?? "——"}
            </Text>
          </View>

          {/* Expiry badge */}
          {codeStatus ? (
            <View style={[
              styles.expiryRow,
              codeStatus.expired ? styles.expiryExpired
                : codeStatus.minutesLeft <= 5 ? styles.expiryWarning
                : styles.expiryOk,
            ]}>
              <Ionicons
                name={codeStatus.expired ? "warning-outline" : "time-outline"}
                size={13}
                color={codeStatus.expired ? Colors.ERROR : codeStatus.minutesLeft <= 5 ? Colors.WARNING : Colors.SUCCESS}
              />
              <Text style={[
                styles.expiryText,
                { color: codeStatus.expired ? Colors.ERROR : codeStatus.minutesLeft <= 5 ? Colors.WARNING : Colors.SUCCESS },
              ]}>
                {codeStatus.expired
                  ? "Code expired — please generate a new one"
                  : codeStatus.minutesLeft === 1
                  ? "Expires in 1 minute! Regenerate soon"
                  : `Valid for ${codeStatus.minutesLeft} more minutes`}
              </Text>
            </View>
          ) : (
            <View style={[styles.expiryRow, styles.expiryOk]}>
              <Ionicons name="time-outline" size={13} color={Colors.TEXT_MUTED} />
              <Text style={[styles.expiryText, { color: Colors.TEXT_MUTED }]}>
                Codes are valid for 15 minutes after generation
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.inviteActions}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={16} color={Colors.PRIMARY} />
              <Text style={styles.shareBtnText}>Share Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.regenBtn, codeStatus?.expired && styles.regenBtnUrgent]}
              onPress={handleRegenerateCode}
              disabled={regenerating}
              activeOpacity={0.8}
            >
              {regenerating
                ? <ActivityIndicator size="small" color={codeStatus?.expired ? Colors.ERROR : Colors.WARNING} />
                : <Ionicons name="refresh-outline" size={16} color={codeStatus?.expired ? Colors.ERROR : Colors.WARNING} />
              }
              <Text style={[styles.regenBtnText, codeStatus?.expired && { color: Colors.ERROR }]}>
                New Code
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.inviteHint}>
            Share with other organizations to collaborate. Codes expire after {INVITE_VALIDITY_MINUTES} minutes.
          </Text>
        </View>

        {/* ── FEATURES section ──────────────────────────── */}
        <Text style={styles.sectionLabel}>FEATURES</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon="document-text-outline"
            iconBg="rgba(139,92,246,0.2)"
            iconColor="#C4B5FD"
            label="Post-Event Report"
            subtitle="AI-generated insights"
            onPress={() => router.push("/(tabs)/report")}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="people-outline"
            iconBg="rgba(16,185,129,0.2)"
            iconColor="#6EE7B7"
            label="Partner Management"
            subtitle="Manage organizations"
            onPress={() => handleComingSoon("Partner Management")}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="notifications-outline"
            iconBg="rgba(245,158,11,0.2)"
            iconColor="#FCD34D"
            label="Notifications"
            subtitle="View all alerts"
            onPress={() => handleComingSoon("Notifications")}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="chatbubbles-outline"
            iconBg="rgba(239,68,68,0.2)"
            iconColor="#FCA5A5"
            label="Rooms & Members"
            subtitle="Host-only management"
            onPress={() => router.push("/rooms")}
          />
        </View>

        {/* ── COLLABORATIONS section ────────────────────── */}
        <Text style={styles.sectionLabel}>COLLABORATIONS</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon="mail-outline"
            iconBg="rgba(59,130,246,0.2)"
            iconColor="#93C5FD"
            label="Invitations"
            subtitle="View partnership proposals"
            onPress={() => router.push("/invitations/inbox")}
          />
        </View>

        {/* ── ACCOUNT section ───────────────────────────── */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon="log-out-outline"
            iconBg="rgba(239,68,68,0.15)"
            iconColor={Colors.ERROR}
            label="Log Out"
            onPress={handleSignOut}
            danger
            hideChevron
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },
  container: { paddingHorizontal: 20, paddingTop: 8 },

  pageTitle: {
    fontSize: 26, fontWeight: "800", color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.5, marginBottom: 20,
  },

  // Profile card
  profileCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.BG_CARD, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.BORDER,
    padding: 16, marginBottom: 16, gap: 14,
  },
  avatarWrapper: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2, overflow: "hidden",
    flexShrink: 0,
  },
  avatarInner: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 28 },
  avatarText: { fontSize: 20, fontWeight: "800" },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  orgName: { fontSize: 15, fontWeight: "700", color: Colors.TEXT_PRIMARY, flex: 1 },
  hostBadge: {
    backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: "rgba(59,130,246,0.3)",
  },
  hostBadgeText: { color: "#93C5FD", fontSize: 11, fontWeight: "700" },
  userEmail: { fontSize: 12, color: Colors.TEXT_SECONDARY },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1, borderColor: Colors.BORDER,
    padding: 14, alignItems: "center", gap: 3,
  },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 10, color: Colors.TEXT_MUTED, fontWeight: "600", textAlign: "center" },

  // Capabilities
  capCard: {
    backgroundColor: Colors.BG_CARD, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.BORDER, padding: 16, marginBottom: 20,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  capChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "rgba(16,185,129,0.08)", borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
  },
  capChipText: { color: "#86EFAC", fontSize: 12, fontWeight: "500" },

  // Section labels
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: Colors.TEXT_MUTED,
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
  },

  // Invite code card
  inviteCard: {
    backgroundColor: Colors.BG_CARD, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.BORDER,
    padding: 18, marginBottom: 20, gap: 12,
  },
  codeBox: {
    backgroundColor: Colors.BG_SURFACE, borderRadius: 12,
    paddingVertical: 16, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(59,130,246,0.2)",
  },
  codeBoxExpired: {
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.05)",
  },
  codeText: {
    fontSize: 30, fontWeight: "800", color: Colors.PRIMARY, letterSpacing: 8,
  },
  expiryRow: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  expiryOk: {
    backgroundColor: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.25)",
  },
  expiryWarning: {
    backgroundColor: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.25)",
  },
  expiryExpired: {
    backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)",
  },
  expiryText: { fontSize: 12, fontWeight: "600", flex: 1 },
  inviteActions: { flexDirection: "row", gap: 10 },
  shareBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 12, borderRadius: 12,
    backgroundColor: "rgba(59,130,246,0.12)", borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
  },
  shareBtnText: { color: Colors.PRIMARY, fontSize: 13, fontWeight: "700" },
  regenBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 12, borderRadius: 12,
    backgroundColor: "rgba(245,158,11,0.08)", borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
  },
  regenBtnUrgent: {
    backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)",
  },
  regenBtnText: { color: Colors.WARNING, fontSize: 13, fontWeight: "700" },
  inviteHint: { color: Colors.TEXT_MUTED, fontSize: 11, textAlign: "center", lineHeight: 17 },

  // Menu groups
  menuGroup: {
    backgroundColor: Colors.BG_CARD, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.BORDER,
    overflow: "hidden", marginBottom: 20,
  },
  menuRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "600", color: Colors.TEXT_PRIMARY },
  menuSub: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.BORDER, marginLeft: 66 },
});

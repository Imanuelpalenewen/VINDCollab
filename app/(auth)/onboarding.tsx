import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
} from "react-native";
import { useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors } from "@/constants/Colors";

type Mode = "create" | "join";

const CATEGORIES = [
  "Student Government",
  "Educational Club",
  "Arts & Culture",
  "Sports",
  "Technology",
  "Social & Community",
  "Religious",
  "Media & Publication",
  "Entrepreneurship",
  "Other",
];

const CAPABILITIES = [
  "Event Venue",
  "Sound System",
  "Photography",
  "Videography",
  "Marketing",
  "Sponsorship",
  "Catering",
  "Design",
  "MC / Host",
  "Social Media",
  "Transportation",
  "Decoration",
  "Security",
  "Registration",
  "Technical Support",
];

export default function OnboardingScreen() {
  const [mode, setMode] = useState<Mode>("create");

  // Create org state
  const [orgName, setOrgName] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Join state
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const createOrg = useMutation(api.organizations.createOrganization);
  const joinOrg = useMutation(api.organizations.joinByInviteCode);

  const toggleCapability = (cap: string) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleCreate = async () => {
    const e: Record<string, string> = {};
    if (!orgName.trim()) e.name = "Organization name is required.";
    if (!category) {
      e.category = "Please select a category.";
    } else if (category === "Other" && !customCategory.trim()) {
      e.category = "Please specify your category.";
    }
    if (capabilities.length === 0) e.capabilities = "Select at least one capability.";
    setCreateErrors(e);
    if (Object.keys(e).length > 0) return;

    // Resolve the final category value
    const resolvedCategory =
      category === "Other" ? customCategory.trim() : category!;

    setLoading(true);
    try {
      await createOrg({
        name: orgName.trim(),
        category: resolvedCategory,
        capabilities,
      });
      // AuthGuard detects hasOrg → true → redirects to (tabs)
    } catch (err: any) {
      setCreateErrors({ name: err?.message ?? "Failed to create organization." });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoinError(null);
    if (inviteCode.trim().length !== 6) {
      setJoinError("Invite code must be exactly 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await joinOrg({ inviteCode: inviteCode.trim() });
      // AuthGuard detects hasOrg → true → redirects to (tabs)
    } catch (err: any) {
      setJoinError(err?.message ?? "Invalid invite code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="flag" size={28} color={Colors.PRIMARY} />
          </View>
          <Text style={styles.title}>Set Up Your Organization</Text>
          <Text style={styles.subtitle}>
            Create a new organization or join an existing one with an invite code.
          </Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === "create" && styles.toggleBtnActive]}
            onPress={() => setMode("create")}
          >
            <Text style={[styles.toggleText, mode === "create" && styles.toggleTextActive]}>
              Create New
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === "join" && styles.toggleBtnActive]}
            onPress={() => setMode("join")}
          >
            <Text style={[styles.toggleText, mode === "join" && styles.toggleTextActive]}>
              Join Organization
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── CREATE MODE ── */}
        {mode === "create" && (
          <View style={styles.card}>
            <Input
              label="Organization Name"
              icon="business-outline"
              placeholder="e.g. BEM Universitas Klabat"
              value={orgName}
              onChangeText={setOrgName}
              autoCapitalize="words"
              error={createErrors.name}
            />

            {/* Category picker */}
            <Text style={styles.fieldLabel}>Category</Text>
            {createErrors.category && (
              <Text style={styles.fieldError}>{createErrors.category}</Text>
            )}
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    setCategory(cat);
                    // Clear custom text if user switches away from Other
                    if (cat !== "Other") setCustomCategory("");
                  }}
                  style={[
                    styles.chip,
                    category === cat && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      category === cat && styles.chipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom category input — only shown when "Other" is selected */}
            {category === "Other" && (
              <View style={styles.customCategoryWrapper}>
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={Colors.TEXT_MUTED}
                  style={styles.customCategoryIcon}
                />
                <TextInput
                  style={styles.customCategoryInput}
                  placeholder="Specify your category..."
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
            )}

            {/* Capabilities multi-select */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
              Capabilities{" "}
              <Text style={styles.fieldLabelHint}>
                ({capabilities.length} selected)
              </Text>
            </Text>
            {createErrors.capabilities && (
              <Text style={styles.fieldError}>{createErrors.capabilities}</Text>
            )}
            <View style={styles.chipGrid}>
              {CAPABILITIES.map((cap) => (
                <TouchableOpacity
                  key={cap}
                  onPress={() => toggleCapability(cap)}
                  style={[
                    styles.chip,
                    capabilities.includes(cap) && styles.chipSelected,
                  ]}
                >
                  {capabilities.includes(cap) && (
                    <Ionicons
                      name="checkmark"
                      size={11}
                      color={Colors.PRIMARY}
                      style={{ marginRight: 3 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      capabilities.includes(cap) && styles.chipTextSelected,
                    ]}
                  >
                    {cap}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Create Organization"
              onPress={handleCreate}
              loading={loading}
              style={styles.actionBtn}
            />
          </View>
        )}

        {/* ── JOIN MODE ── */}
        {mode === "join" && (
          <View style={styles.card}>
            <Text style={styles.joinHint}>
              Ask your organization admin for the 6-character invite code.
            </Text>

            {joinError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={15} color={Colors.ERROR} />
                <Text style={styles.errorBannerText}>{joinError}</Text>
              </View>
            )}

            {/* Custom invite code input */}
            <Text style={styles.fieldLabel}>Invite Code</Text>
            <View style={styles.codeInputWrapper}>
              <TextInput
                style={styles.codeInput}
                value={inviteCode}
                onChangeText={(t) => setInviteCode(t.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                placeholderTextColor={Colors.TEXT_MUTED}
                autoCapitalize="characters"
                maxLength={6}
              />
            </View>

            <Button
              title="Join Organization"
              onPress={handleJoin}
              loading={loading}
              style={styles.actionBtn}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
  },
  orbTop: {
    position: "absolute",
    top: -100,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(139, 92, 246, 0.09)",
  },
  orbBottom: {
    position: "absolute",
    bottom: 0,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  // Toggle
  toggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: Colors.PRIMARY,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  toggleText: {
    color: Colors.TEXT_MUTED,
    fontSize: 14,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#fff",
  },
  // Card
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  // Field labels
  fieldLabel: {
    color: Colors.TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  fieldLabelHint: {
    color: Colors.TEXT_MUTED,
    fontWeight: "400",
    textTransform: "none",
    fontSize: 11,
  },
  fieldError: {
    color: Colors.ERROR,
    fontSize: 12,
    marginBottom: 6,
    marginTop: -4,
  },
  // Chips
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_INPUT,
  },
  chipSelected: {
    borderColor: "rgba(59, 130, 246, 0.6)",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  chipText: {
    color: Colors.TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: Colors.PRIMARY,
    fontWeight: "700",
  },
  // Custom category input (shown when "Other" is selected)
  customCategoryWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.BORDER_FOCUS,
    paddingHorizontal: 14,
    height: 50,
    marginTop: 12,
  },
  customCategoryIcon: {
    marginRight: 10,
  },
  customCategoryInput: {
    flex: 1,
    color: Colors.TEXT_PRIMARY,
    fontSize: 14,
    height: "100%",
  },
  // Join mode
  joinHint: {
    color: Colors.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  errorBannerText: {
    color: Colors.ERROR,
    fontSize: 13,
    flex: 1,
  },
  codeInputWrapper: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    paddingHorizontal: 20,
    height: 60,
    justifyContent: "center",
    marginBottom: 8,
  },
  codeInput: {
    color: Colors.TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 10,
  },
  actionBtn: {
    marginTop: 20,
  },
});

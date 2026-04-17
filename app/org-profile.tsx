import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/Colors";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Student Government", "Educational Club", "Arts & Culture", "Sports",
  "Technology", "Social & Community", "Religious", "Media & Publication",
  "Entrepreneurship", "Other",
];

const CAPABILITIES = [
  "Event Venue", "Sound System", "Photography", "Videography",
  "Marketing", "Sponsorship", "Catering", "Design", "MC / Host",
  "Social Media", "Transportation", "Decoration", "Security",
  "Registration", "Technical Support",
];

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

// ── Screen ────────────────────────────────────────────────────────────────────

/**
 * Organization Profile Edit Screen
 * Accessible via router.push("/org-profile") from More tab or Home header.
 * Shows logo upload + edit form for name, category, capabilities.
 */
export default function OrgProfileScreen() {
  const router = useRouter();
  const org = useQuery(api.organizations.getMyOrg);

  const updateOrgMutation = useMutation(api.organizations.updateOrg);
  const generateUploadUrlMutation = useMutation(api.organizations.generateUploadUrl);
  const updateLogoMutation = useMutation(api.organizations.updateOrgLogo);

  const [name, setName] = useState<string | null>(null);       // null = not yet initialised
  const [category, setCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState("");
  const [capabilities, setCapabilities] = useState<string[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Lazily initialise edit fields from org data the first time it loads
  if (org && name === null) {
    const isPredefined = CATEGORIES.includes(org.category);
    setName(org.name);
    setCategory(isPredefined ? org.category : "Other");
    setCustomCategory(isPredefined ? "" : org.category);
    setCapabilities([...org.capabilities]);
  }

  const toggleCapability = (cap: string) => {
    setCapabilities((prev) =>
      prev === null ? [cap] : prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  // ── Save handler ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    const e: Record<string, string> = {};
    if (!name?.trim()) e.name = "Organization name is required.";
    if (!category) {
      e.category = "Please select a category.";
    } else if (category === "Other" && !customCategory.trim()) {
      e.category = "Please specify your category.";
    }
    if (!capabilities || capabilities.length === 0) e.capabilities = "Select at least one capability.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const resolvedCategory = category === "Other" ? customCategory.trim() : category!;
    setSaving(true);
    try {
      await updateOrgMutation({ name: name!.trim(), category: resolvedCategory, capabilities: capabilities! });
      router.back();
    } catch (err: any) {
      setErrors({ name: err?.message ?? "Failed to save changes." });
    } finally {
      setSaving(false);
    }
  };

  // ── Logo upload ───────────────────────────────────────────────────────────

  const handlePickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow photo library access in Settings.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    setUploadingLogo(true);
    try {
      const uploadUrl = await generateUploadUrlMutation({});
      const imageBlob = await fetch(result.assets[0].uri).then((r) => r.blob());
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": imageBlob.type || "image/jpeg" },
        body: imageBlob,
      });
      const { storageId } = await res.json();
      await updateLogoMutation({ storageId });
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message ?? "Could not upload image.");
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (org === undefined || name === null) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  const avatarColor = getAvatarColor(org.name);
  const initials = getInitials(org.name);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.TEXT_SECONDARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Organization</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* ── Logo upload ──────────────────────────────── */}
        <View style={styles.logoSection}>
          <TouchableOpacity
            onPress={handlePickLogo}
            disabled={uploadingLogo}
            style={[styles.avatarRing, { borderColor: avatarColor + "55" }]}
            activeOpacity={0.8}
          >
            {uploadingLogo ? (
              <View style={[styles.avatarInner, { backgroundColor: avatarColor + "22" }]}>
                <ActivityIndicator color={avatarColor} />
              </View>
            ) : org.logoUrl ? (
              <Image source={{ uri: org.logoUrl }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={[styles.avatarInner, { backgroundColor: avatarColor + "22" }]}>
                <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.logoHint}>
            {org.logoUrl ? "Tap to change logo" : "Tap to upload logo (optional)"}
          </Text>
        </View>

        {/* ── Edit form ────────────────────────────────── */}
        <View style={styles.formCard}>
          <Input
            label="Organization Name"
            icon="business-outline"
            placeholder="e.g. BEM Universitas Klabat"
            value={name ?? ""}
            onChangeText={setName}
            autoCapitalize="words"
            error={errors.name}
          />

          {/* Category */}
          <Text style={styles.fieldLabel}>Category</Text>
          {errors.category && <Text style={styles.fieldError}>{errors.category}</Text>}
          <View style={styles.chipGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => { setCategory(cat); if (cat !== "Other") setCustomCategory(""); }}
                style={[styles.chip, category === cat && styles.chipSelected]}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {category === "Other" && (
            <View style={styles.customCatWrapper}>
              <Ionicons name="create-outline" size={18} color={Colors.TEXT_MUTED} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.customCatInput}
                placeholder="Specify your category..."
                placeholderTextColor={Colors.TEXT_MUTED}
                value={customCategory}
                onChangeText={setCustomCategory}
                autoCapitalize="words"
                autoFocus
              />
            </View>
          )}

          {/* Capabilities */}
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
            Capabilities{" "}
            <Text style={styles.fieldLabelHint}>({capabilities?.length ?? 0} selected)</Text>
          </Text>
          {errors.capabilities && <Text style={styles.fieldError}>{errors.capabilities}</Text>}
          <View style={styles.chipGrid}>
            {CAPABILITIES.map((cap) => (
              <TouchableOpacity
                key={cap}
                onPress={() => toggleCapability(cap)}
                style={[styles.chip, capabilities?.includes(cap) && styles.chipSelected]}
              >
                {capabilities?.includes(cap) && (
                  <Ionicons name="checkmark" size={11} color={Colors.PRIMARY} style={{ marginRight: 3 }} />
                )}
                <Text style={[styles.chipText, capabilities?.includes(cap) && styles.chipTextSelected]}>
                  {cap}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button title="Save Changes" onPress={handleSave} loading={saving} style={styles.saveBtn} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },
  centered: { flex: 1, backgroundColor: Colors.BG_DARK, alignItems: "center", justifyContent: "center" },
  container: { paddingHorizontal: 20, paddingTop: 8 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.TEXT_PRIMARY, letterSpacing: -0.3 },

  // Logo
  logoSection: { alignItems: "center", marginBottom: 24 },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 2,
    overflow: "hidden", position: "relative",
  },
  avatarInner: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 48 },
  avatarText: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  cameraOverlay: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.PRIMARY, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.BG_DARK,
  },
  logoHint: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 8 },

  // Form
  formCard: {
    backgroundColor: Colors.BG_CARD, borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: Colors.BORDER,
  },
  fieldLabel: {
    color: Colors.TEXT_SECONDARY, fontSize: 12, fontWeight: "600",
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10,
  },
  fieldLabelHint: { color: Colors.TEXT_MUTED, fontWeight: "400", textTransform: "none", fontSize: 11 },
  fieldError: { color: Colors.ERROR, fontSize: 12, marginBottom: 6, marginTop: -4 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.BORDER, backgroundColor: Colors.BG_INPUT,
  },
  chipSelected: { borderColor: "rgba(59,130,246,0.6)", backgroundColor: "rgba(59,130,246,0.12)" },
  chipText: { color: Colors.TEXT_SECONDARY, fontSize: 12, fontWeight: "500" },
  chipTextSelected: { color: Colors.PRIMARY, fontWeight: "700" },
  customCatWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.BG_INPUT, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.BORDER_FOCUS,
    paddingHorizontal: 14, height: 50, marginTop: 12,
  },
  customCatInput: { flex: 1, color: Colors.TEXT_PRIMARY, fontSize: 14, height: "100%" },
  saveBtn: { marginTop: 20 },
});

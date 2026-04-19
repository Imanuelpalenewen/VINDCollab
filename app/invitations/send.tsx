import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/Colors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Id } from "@/convex/_generated/dataModel";

const PROPOSED_ROLES = [
  "Co-host",
  "Sponsor",
  "Media Partner",
  "Logistik",
  "Volunteer Coordinator",
];

const DEADLINE_OPTIONS = [
  { label: "24 hours", hours: 24 },
  { label: "48 hours", hours: 48 },
  { label: "72 hours", hours: 72 },
];

export default function SendInvitationScreen() {
  const router = useRouter();
  const { eventId, recipientOrgId: prefilledRecipientId } =
    useLocalSearchParams<{ eventId: string; recipientOrgId?: string }>();

  const sendInvitation = useMutation(api.invitations.sendInvitation);
  const event = useQuery(api.events.getById, {
    id: (eventId ?? "") as Id<"events">,
  });

  // Form state
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [resourceContribution, setResourceContribution] = useState("");
  const [revenueShareEnabled, setRevenueShareEnabled] = useState(false);
  const [revenuePercentage, setRevenuePercentage] = useState("");
  const [revenueMethod, setRevenueMethod] = useState("Bank Transfer");
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [personalMessage, setPersonalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipientOrgId, setRecipientOrgId] = useState<string | null>(
    prefilledRecipientId ?? null
  );

  const charCount = personalMessage.length;
  const maxChars = 300;

  const handleSendInvitation = useCallback(async () => {
    if (!eventId || !recipientOrgId || !selectedRole) {
      Alert.alert("Missing Fields", "Please fill in all required fields");
      return;
    }

    if (charCount > maxChars) {
      Alert.alert("Message Too Long", `Personal message cannot exceed ${maxChars} characters`);
      return;
    }

    setLoading(true);
    try {
      const responseDeadline = Date.now() + deadlineHours * 60 * 60 * 1000;

      const revenueSharing = revenueShareEnabled
        ? {
            percentage: parseFloat(revenuePercentage) || 0,
            method: revenueMethod,
          }
        : undefined;

      await sendInvitation({
        eventId: eventId as Id<"events">,
        recipientOrgId: recipientOrgId as Id<"organizations">,
        proposedRole: selectedRole,
        resourceContribution: resourceContribution.trim() || undefined,
        revenueSharing,
        responseDeadline,
        personalMessage: personalMessage.trim() || undefined,
      });

      Alert.alert("Success", "Invitation sent successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  }, [eventId, recipientOrgId, selectedRole, revenueShareEnabled, revenuePercentage, revenueMethod, deadlineHours, resourceContribution, personalMessage]);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.TEXT_SECONDARY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Send Invitation</Text>
          {event && (
            <Text style={s.headerSubtitle} numberOfLines={1}>
              {event.title}
            </Text>
          )}
        </View>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Recipient Org */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recipient Organization</Text>
          <TouchableOpacity
            style={s.orgSelector}
            onPress={() => {
              // TODO: Implement org picker modal
              Alert.alert("Select Organization", "Org picker coming soon");
            }}
          >
            <Ionicons name="business" size={18} color={Colors.TEXT_MUTED} />
            <Text
              style={[
                s.orgSelectorText,
                !recipientOrgId && s.orgSelectorPlaceholder,
              ]}
            >
              {recipientOrgId ? `Org: ${recipientOrgId}` : "Select partner organization"}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.TEXT_MUTED}
            />
          </TouchableOpacity>
        </View>

        {/* Proposed Role */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Proposed Role *</Text>
          <View style={s.roleGrid}>
            {PROPOSED_ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  s.roleChip,
                  selectedRole === role && s.roleChipSelected,
                ]}
                onPress={() => setSelectedRole(role)}
              >
                {selectedRole === role && (
                  <Ionicons
                    name="checkmark"
                    size={11}
                    color={Colors.PRIMARY}
                    style={s.roleChipIcon}
                  />
                )}
                <Text
                  style={[
                    s.roleChipText,
                    selectedRole === role && s.roleChipTextSelected,
                  ]}
                >
                  {role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Resource Contribution */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Resource Contribution</Text>
          <TextInput
            style={s.textArea}
            placeholder="e.g., Handle venue + catering for 500 pax"
            placeholderTextColor={Colors.TEXT_MUTED}
            multiline
            numberOfLines={4}
            value={resourceContribution}
            onChangeText={setResourceContribution}
          />
        </View>

        {/* Revenue Sharing */}
        <View style={s.section}>
          <View style={s.revenueSectionHeader}>
            <Text style={s.sectionTitle}>Revenue Sharing</Text>
            <Switch
              value={revenueShareEnabled}
              onValueChange={setRevenueShareEnabled}
              trackColor={{ false: Colors.BORDER, true: Colors.PRIMARY }}
            />
          </View>

          {revenueShareEnabled && (
            <>
              <Input
                label="Revenue Percentage (%)"
                placeholder="e.g., 15"
                keyboardType="decimal-pad"
                value={revenuePercentage}
                onChangeText={setRevenuePercentage}
                containerStyle={s.mb12}
              />
              <Input
                label="Distribution Method"
                placeholder="e.g., Bank Transfer"
                value={revenueMethod}
                onChangeText={setRevenueMethod}
              />
            </>
          )}
        </View>

        {/* Response Deadline */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Response Deadline</Text>
          <View style={s.deadlineGrid}>
            {DEADLINE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.hours}
                style={[
                  s.deadlineChip,
                  deadlineHours === option.hours && s.deadlineChipSelected,
                ]}
                onPress={() => setDeadlineHours(option.hours)}
              >
                <Text
                  style={[
                    s.deadlineChipText,
                    deadlineHours === option.hours && s.deadlineChipTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Personal Message */}
        <View style={s.section}>
          <View style={s.messageHeader}>
            <Text style={s.sectionTitle}>Personal Message</Text>
            <Text
              style={[
                s.charCounter,
                charCount > maxChars * 0.9 && s.charCounterWarning,
              ]}
            >
              {charCount}/{maxChars}
            </Text>
          </View>
          <TextInput
            style={[s.textArea, charCount > maxChars && s.textAreaError]}
            placeholder="Add a personal note (optional)"
            placeholderTextColor={Colors.TEXT_MUTED}
            multiline
            numberOfLines={4}
            maxLength={maxChars}
            value={personalMessage}
            onChangeText={setPersonalMessage}
          />
          {charCount > maxChars && (
            <Text style={s.errorText}>Message exceeds maximum length</Text>
          )}
        </View>

        {/* Summary */}
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>Summary</Text>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Role:</Text>
            <Badge label={selectedRole ?? "Not selected"} />
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Deadline:</Text>
            <Text style={s.summaryValue}>{deadlineHours}h</Text>
          </View>
          {revenueShareEnabled && (
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Revenue Share:</Text>
              <Text style={s.summaryValue}>{revenuePercentage}%</Text>
            </View>
          )}
        </View>

        {/* Send Button */}
        <Button
          title={loading ? "" : "Send Invitation"}
          onPress={handleSendInvitation}
          loading={loading}
          style={s.sendButton}
        />

        <View style={s.spacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  orgSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  orgSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  orgSelectorPlaceholder: {
    color: Colors.TEXT_MUTED,
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  roleChipSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderColor: Colors.PRIMARY,
  },
  roleChipIcon: {
    marginRight: 4,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  roleChipTextSelected: {
    color: Colors.PRIMARY,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "500",
    textAlignVertical: "top",
    minHeight: 100,
  },
  textAreaError: {
    borderColor: "rgba(239, 68, 68, 0.6)",
    backgroundColor: "rgba(239, 68, 68, 0.04)",
  },
  errorText: {
    fontSize: 12,
    color: Colors.ERROR,
    marginTop: 6,
  },
  revenueSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  mb12: {
    marginBottom: 12,
  },
  deadlineGrid: {
    flexDirection: "row",
    gap: 8,
  },
  deadlineChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  deadlineChipSelected: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  deadlineChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  deadlineChipTextSelected: {
    color: "#fff",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  charCounter: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },
  charCounterWarning: {
    color: Colors.WARNING,
    fontWeight: "700",
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
    padding: 14,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_MUTED,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  sendButton: {
    marginBottom: 16,
  },
  spacing: {
    height: 20,
  },
});

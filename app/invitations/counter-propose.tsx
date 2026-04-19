import React, { useState } from "react";
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
import { Card } from "@/components/ui/Card";
import { Id } from "@/convex/_generated/dataModel";

const PROPOSED_ROLES = [
  "Co-host",
  "Sponsor",
  "Media Partner",
  "Logistik",
  "Volunteer Coordinator",
];

export default function CounterProposeScreen() {
  const router = useRouter();
  const { invitationId } = useLocalSearchParams<{ invitationId: string }>();

  const counterProposeMutation = useMutation(api.invitations.counterPropose);
  const invitation = useQuery(api.invitations.getInvitationDetail, {
    invitationId: (invitationId ?? "") as Id<"invitations">,
  });

  // Form state
  const [selectedRole, setSelectedRole] = useState<string | null>(
    invitation?.proposedRole ?? null
  );
  const [resourceContribution, setResourceContribution] = useState(
    invitation?.resourceContribution ?? ""
  );
  const [revenueShareEnabled, setRevenueShareEnabled] = useState(
    !!invitation?.revenueSharing
  );
  const [revenuePercentage, setRevenuePercentage] = useState(
    invitation?.revenueSharing?.percentage.toString() ?? ""
  );
  const [revenueMethod, setRevenueMethod] = useState(
    invitation?.revenueSharing?.method ?? "Bank Transfer"
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!invitation) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  const nextRound = invitation.negotiationRounds + 1;
  const maxRounds = 5;
  const canPropose = nextRound <= maxRounds;

  const handleCounterPropose = async () => {
    if (!selectedRole) {
      Alert.alert("Missing Fields", "Please select a proposed role");
      return;
    }

    if (!canPropose) {
      Alert.alert("Limit Reached", `Maximum ${maxRounds} negotiation rounds exceeded`);
      return;
    }

    setLoading(true);
    try {
      const revenueSharing = revenueShareEnabled
        ? {
            percentage: parseFloat(revenuePercentage) || 0,
            method: revenueMethod,
          }
        : undefined;

      await counterProposeMutation({
        invitationId: invitationId as Id<"invitations">,
        proposedRole: selectedRole,
        resourceContribution: resourceContribution.trim() || undefined,
        revenueSharing,
        notes: notes.trim() || undefined,
      });

      Alert.alert("Success", "Counter-proposal sent!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to send counter-proposal");
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={s.headerTitle}>Counter-Propose</Text>
          <Text style={s.headerSubtitle}>
            Round {nextRound} of {maxRounds}
          </Text>
        </View>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Warning if close to limit */}
        {nextRound >= maxRounds && (
          <View style={s.warningCard}>
            <Ionicons
              name="alert-circle"
              size={16}
              color={Colors.WARNING}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.warningText}>
                This is the final round of negotiations. After this, the invitation will
                expire.
              </Text>
            </View>
          </View>
        )}

        {/* Current Terms */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Current Terms</Text>
          <Card style={s.currentTermsCard}>
            <View style={s.currentTermItem}>
              <Text style={s.currentTermLabel}>Role:</Text>
              <Badge label={invitation.proposedRole} />
            </View>
            {invitation.resourceContribution && (
              <View style={s.currentTermItem}>
                <Text style={s.currentTermLabel}>Resources:</Text>
                <Text style={s.currentTermValue}>
                  {invitation.resourceContribution}
                </Text>
              </View>
            )}
            {invitation.revenueSharing && (
              <View style={s.currentTermItem}>
                <Text style={s.currentTermLabel}>Revenue:</Text>
                <Text style={s.currentTermValue}>
                  {invitation.revenueSharing.percentage}%
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* New Terms */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Your Counter-Proposal</Text>

          {/* Role */}
          <View style={s.subsection}>
            <Text style={s.subsectionTitle}>Proposed Role</Text>
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

          {/* Resources */}
          <View style={s.subsection}>
            <Text style={s.subsectionTitle}>Resource Contribution</Text>
            <TextInput
              style={s.textArea}
              placeholder="e.g., Handle venue + catering for 500 pax"
              placeholderTextColor={Colors.TEXT_MUTED}
              multiline
              numberOfLines={3}
              value={resourceContribution}
              onChangeText={setResourceContribution}
            />
          </View>

          {/* Revenue Sharing */}
          <View style={s.subsection}>
            <View style={s.revenueSectionHeader}>
              <Text style={s.subsectionTitle}>Revenue Sharing</Text>
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

          {/* Notes */}
          <View style={s.subsection}>
            <Text style={s.subsectionTitle}>Notes (Optional)</Text>
            <TextInput
              style={s.textArea}
              placeholder="Explain why you're proposing these changes..."
              placeholderTextColor={Colors.TEXT_MUTED}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={s.actionsSection}>
          <Button
            title={loading ? "" : "Send Counter-Proposal"}
            onPress={handleCounterPropose}
            loading={loading}
            disabled={!canPropose}
            style={s.sendButton}
          />
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            disabled={loading}
          />
        </View>

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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: Colors.WARNING,
    lineHeight: 18,
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
  currentTermsCard: {
    gap: 10,
  },
  currentTermItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentTermLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_MUTED,
  },
  currentTermValue: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  subsection: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.TEXT_SECONDARY,
    marginBottom: 8,
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
    minHeight: 80,
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
  actionsSection: {
    gap: 10,
    marginBottom: 16,
  },
  sendButton: {
    marginBottom: 0,
  },
  spacing: {
    height: 20,
  },
});

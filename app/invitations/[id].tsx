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
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/Colors";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Id } from "@/convex/_generated/dataModel";
import NegotiationHistoryView from "@/components/invitations/NegotiationHistoryView";

export default function InvitationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const invitation = useQuery(api.invitations.getInvitationDetail, {
    invitationId: (id ?? "") as Id<"invitations">,
  });

  const respondMutation = useMutation(api.invitations.respondToInvitation);
  const counterProposeMutation = useMutation(
    api.invitations.counterPropose
  );

  const [responding, setResponding] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  if (!invitation) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = {
    PENDING: Colors.WARNING,
    ACCEPTED: Colors.SUCCESS,
    DECLINED: Colors.ERROR,
    NEGOTIATING: Colors.INFO,
    EXPIRED: Colors.ERROR,
  }[invitation.status] || Colors.TEXT_MUTED;

  const canRespond = invitation.status === "PENDING" || invitation.status === "NEGOTIATING";
  const isRecipient = true; // Simplified - in real app, check current org

  const handleAccept = async () => {
    setResponding(true);
    try {
      await respondMutation({
        invitationId: id as Id<"invitations">,
        response: "ACCEPTED",
      });
      Alert.alert("Success", "Invitation accepted!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to accept invitation");
    } finally {
      setResponding(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      Alert.alert("Required", "Please provide a reason for declining");
      return;
    }

    setResponding(true);
    try {
      await respondMutation({
        invitationId: id as Id<"invitations">,
        response: "DECLINED",
        declineReason: declineReason.trim(),
      });
      Alert.alert("Declined", "Invitation declined", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to decline invitation");
    } finally {
      setResponding(false);
      setShowDeclineModal(false);
    }
  };

  const handleCounterPropose = () => {
    if (invitation.negotiationRounds >= 5) {
      Alert.alert("Limit Reached", "Maximum 5 negotiation rounds exceeded");
      return;
    }
    router.push({
      pathname: "/invitations/counter-propose",
      params: { invitationId: id },
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const deadlineDate = new Date(invitation.responseDeadline);
  const isExpired = deadlineDate < new Date();

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
          <Text style={s.headerTitle}>Invitation Details</Text>
        </View>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={s.statusSection}>
          <Badge label={invitation.status} variant="default" />
          {isExpired && (
            <Text style={s.expiredText}>Deadline has passed</Text>
          )}
          <Text style={s.deadlineText}>
            Deadline: {formatDate(invitation.responseDeadline)}
          </Text>
        </View>

        {/* Event Info */}
        {invitation.event && (
          <Card style={s.infoCard}>
            <View style={s.infoHeader}>
              <Ionicons name="calendar" size={16} color={Colors.ACCENT} />
              <Text style={s.infoTitle}>{invitation.event.title}</Text>
            </View>
            <Text style={s.infoDate}>
              {new Date(invitation.event.startDate).toLocaleDateString()} -{" "}
              {new Date(invitation.event.endDate).toLocaleDateString()}
            </Text>
          </Card>
        )}

        {/* Organizations Info */}
        <View style={s.orgsSection}>
          <View style={s.orgBox}>
            <Text style={s.orgLabel}>From</Text>
            <Text style={s.orgName}>{invitation.senderOrg?.name ?? "Organization"}</Text>
          </View>
          <View style={s.arrowContainer}>
            <Ionicons name="arrow-forward" size={20} color={Colors.TEXT_MUTED} />
          </View>
          <View style={s.orgBox}>
            <Text style={s.orgLabel}>To</Text>
            <Text style={s.orgName}>{invitation.recipientOrg?.name ?? "Organization"}</Text>
          </View>
        </View>

        {/* Terms */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Proposed Terms</Text>

          <Card style={s.termCard}>
            <View style={s.termRow}>
              <Text style={s.termLabel}>Role:</Text>
              <Badge label={invitation.proposedRole} />
            </View>

            {invitation.resourceContribution && (
              <View style={s.termRow}>
                <Text style={s.termLabel}>Resources:</Text>
                <Text style={s.termValue}>{invitation.resourceContribution}</Text>
              </View>
            )}

            {invitation.revenueSharing && (
              <View style={s.termRow}>
                <Text style={s.termLabel}>Revenue Share:</Text>
                <Text style={s.termValue}>
                  {invitation.revenueSharing.percentage}% ({invitation.revenueSharing.method})
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Personal Message */}
        {invitation.personalMessage && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Message</Text>
            <Card style={s.messageCard}>
              <Text style={s.messageText}>{invitation.personalMessage}</Text>
            </Card>
          </View>
        )}

        {/* Decline Reason (if declined) */}
        {invitation.declineReason && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Decline Reason</Text>
            <Card style={s.declineMessageCard}>
              <Text style={s.messageText}>{invitation.declineReason}</Text>
            </Card>
          </View>
        )}

        {/* Negotiation Status */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Negotiation Status</Text>
          <Card style={s.statusCard}>
            <Text style={s.statusText}>
              Round {invitation.negotiationRounds} of 5
            </Text>
            <View style={s.roundsBar}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.roundsBarSegment,
                    i < invitation.negotiationRounds && s.roundsBarSegmentActive,
                  ]}
                />
              ))}
            </View>
          </Card>
        </View>

        {/* Negotiation History */}
        <NegotiationHistoryView invitationId={id as Id<"invitations">} />

        {/* Action Buttons */}
        {canRespond && isRecipient && (
          <View style={s.actionsSection}>
            <Button
              title="Accept"
              onPress={handleAccept}
              loading={responding}
              style={s.acceptButton}
            />
            <Button
              title={
                invitation.negotiationRounds >= 5
                  ? "Max Rounds Reached"
                  : "Counter-Propose"
              }
              onPress={handleCounterPropose}
              variant="outline"
              disabled={invitation.negotiationRounds >= 5}
              style={s.counterButton}
            />
            <Button
              title="Decline"
              onPress={() => setShowDeclineModal(true)}
              variant="ghost"
              style={s.declineButton}
            />
          </View>
        )}

        {invitation.status === "ACCEPTED" && (
          <View style={s.acceptedSection}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.SUCCESS} />
            <Text style={s.acceptedTitle}>Partnership Accepted</Text>
            <Text style={s.acceptedText}>
              This partnership has been confirmed. A chat room has been created.
            </Text>
          </View>
        )}

        <View style={s.spacing} />
      </ScrollView>

      {/* Decline Modal */}
      <Modal
        visible={showDeclineModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeclineModal(false)}
      >
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Why are you declining?</Text>
              <TouchableOpacity onPress={() => setShowDeclineModal(false)}>
                <Ionicons name="close" size={24} color={Colors.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.reasonInput}
              placeholder="Please provide a reason..."
              placeholderTextColor={Colors.TEXT_MUTED}
              multiline
              numberOfLines={4}
              value={declineReason}
              onChangeText={setDeclineReason}
            />

            <View style={s.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowDeclineModal(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title="Decline"
                onPress={handleDecline}
                loading={responding}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  statusSection: {
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 8,
  },
  expiredText: {
    fontSize: 12,
    color: Colors.ERROR,
    fontWeight: "600",
  },
  deadlineText: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },
  infoCard: {
    marginBottom: 16,
    gap: 8,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    flex: 1,
  },
  infoDate: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
  },
  orgsSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  orgBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  orgLabel: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    marginBottom: 4,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  orgName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  arrowContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  termCard: {
    gap: 12,
  },
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  termLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_MUTED,
  },
  termValue: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  messageCard: {
    minHeight: 80,
  },
  messageText: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 20,
  },
  declineCard: {
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  declineMessageCard: {
    minHeight: 80,
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  statusCard: {
    gap: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  roundsBar: {
    flexDirection: "row",
    gap: 4,
    height: 4,
  },
  roundsBarSegment: {
    flex: 1,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  roundsBarSegmentActive: {
    backgroundColor: Colors.ACCENT,
  },
  actionsSection: {
    gap: 10,
    marginBottom: 16,
  },
  acceptButton: {
    marginBottom: 0,
  },
  counterButton: {
    marginBottom: 0,
  },
  declineButton: {
    marginBottom: 0,
  },
  acceptedSection: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  acceptedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.SUCCESS,
  },
  acceptedText: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    justifyContent: "space-between",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  reasonInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "500",
    textAlignVertical: "top",
    minHeight: 120,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  spacing: {
    height: 20,
  },
});

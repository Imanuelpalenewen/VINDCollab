import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/Colors";
import { Badge } from "@/components/ui/Badge";

// ── Components ────────────────────────────────────────────────────────────

interface RoomCardProps {
  room: any;
  onAddMember: (roomId: Id<"chatRooms">) => void;
  onRemoveMember: (roomId: Id<"chatRooms">, orgId: Id<"organizations">) => void;
  onDeleteRoom: (roomId: Id<"chatRooms">) => void;
}

function RoomCard({ room, onAddMember, onRemoveMember, onDeleteRoom }: RoomCardProps) {
  const isProtected = room.name.replace(/^#/, "") === "general" || room.name.replace(/^#/, "") === "announcements";
  
  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (room.name.replace(/^#/, "") === "general") return "chatbubbles-outline";
    if (room.name.replace(/^#/, "") === "announcements") return "megaphone-outline";
    return "chatbox-ellipses-outline";
  };

  return (
    <View style={styles.roomCard}>
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleGroup}>
          <View style={styles.roomIconWrapper}>
            <Ionicons name={getIcon()} size={18} color={Colors.PRIMARY} />
          </View>
          <View>
            <Text style={styles.roomName}>{room.name}</Text>
            <Text style={styles.memberCount}>{room.members.length} members</Text>
          </View>
        </View>
        {!isProtected && (
          <TouchableOpacity onPress={() => onDeleteRoom(room._id)}>
            <Ionicons name="trash-outline" size={20} color={Colors.ERROR} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.memberList}>
        {room.members.map((member: any) => (
          <View key={member._id} style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberOrgName}>{member.orgName}</Text>
              <Badge 
              label={member.role} 
              variant={member.role === "ADMIN" ? "blue" : member.role === "READ_ONLY" ? "amber" : "default"} 
              style={styles.roleBadge}
            />
            </View>
            {member.role !== "ADMIN" && (
              <TouchableOpacity onPress={() => onRemoveMember(room._id, member.orgId)}>
                <Ionicons name="close-circle-outline" size={18} color={Colors.TEXT_MUTED} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.addMemberBtn} 
        onPress={() => onAddMember(room._id)}
      >
        <Ionicons name="add-circle-outline" size={16} color={Colors.PRIMARY} />
        <Text style={styles.addMemberBtnText}>Add Member</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────

export default function RoomsScreen() {
  const router = useRouter();
  const myEvents = useQuery(api.events.listMyEvents) || [];
  
  const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<Id<"chatRooms"> | null>(null);

  // Form states
  const [newRoomName, setNewRoomName] = useState("");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [selectedPartnerOrgId, setSelectedPartnerOrgId] = useState<Id<"organizations"> | null>(null);
  const [selectedRole, setSelectedRole] = useState<"MEMBER" | "READ_ONLY">("MEMBER");

  const rooms = useQuery(api.chat.getRoomsWithMembers, selectedEventId ? { eventId: selectedEventId } : "skip");
  const partnerships = useQuery(api.partnerships.getByEvent, selectedEventId ? { eventId: selectedEventId } : "skip");
  
  const createRoomMutation = useMutation(api.chat.createRoom);
  const addMemberMutation = useMutation(api.chat.addRoomMember);
  const removeMemberMutation = useMutation(api.chat.removeRoomMember);

  useEffect(() => {
    if (myEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(myEvents[0]._id);
    }
  }, [myEvents]);

  const handleCreateRoom = async () => {
    if (!selectedEventId || !newRoomName) return;
    try {
      await createRoomMutation({
        eventId: selectedEventId,
        name: newRoomName.replace(/^#/, ""),
        type: isReadOnly ? "ANNOUNCEMENT" : "EVENT",
      });
      setShowCreateModal(false);
      setNewRoomName("");
      setIsReadOnly(false);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleAddMember = async () => {
    if (!activeRoomId || !selectedPartnerOrgId) return;
    try {
      await addMemberMutation({
        roomId: activeRoomId,
        orgId: selectedPartnerOrgId,
        role: selectedRole,
      });
      setShowAddMemberModal(false);
      setSelectedPartnerOrgId(null);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleRemoveMember = (roomId: Id<"chatRooms">, orgId: Id<"organizations">) => {
    Alert.alert("Remove Member", "Are you sure you want to remove this organization from the room?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMemberMutation({ roomId, orgId }) }
    ]);
  };

  const candidatePartners = partnerships?.filter(p => p.status === "ACCEPTED") || [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT_PRIMARY} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.title}>Room Management</Text>
          <Text style={styles.subtitle}>Manage chat rooms & permissions</Text>
        </View>
        <TouchableOpacity style={styles.newRoomBtn} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={24} color={Colors.PRIMARY} />
        </TouchableOpacity>
      </View>

      <View style={styles.eventSelector}>
        <Text style={styles.label}>Select Event</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventScroll}>
          {myEvents.map(event => (
            <TouchableOpacity 
              key={event._id}
              style={[styles.eventChip, selectedEventId === event._id && styles.eventChipSelected]}
              onPress={() => setSelectedEventId(event._id)}
            >
              <Text style={[styles.eventChipText, selectedEventId === event._id && styles.eventChipTextSelected]}>
                {event.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {rooms === undefined ? (
          <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 40 }} />
        ) : rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.TEXT_MUTED} />
            <Text style={styles.emptyText}>No rooms found for this event</Text>
          </View>
        ) : (
          rooms.map(room => (
            <RoomCard 
              key={room._id} 
              room={room} 
              onAddMember={(id) => { setActiveRoomId(id); setShowAddMemberModal(true); }}
              onRemoveMember={handleRemoveMember}
              onDeleteRoom={() => Alert.alert("Coming Soon", "Room deletion is not yet implemented.")}
            />
          ))
        )}
      </ScrollView>

      {/* Create Room Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Chat Room</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Room Name</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.prefix}>#</Text>
                <TextInput 
                  style={styles.textInput}
                  placeholder="e.g. logistics"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={newRoomName}
                  onChangeText={setNewRoomName}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={styles.switchLabel}>Read-only for partners</Text>
                <Text style={styles.switchSub}>Only host can send messages</Text>
              </View>
              <Switch 
                value={isReadOnly}
                onValueChange={setIsReadOnly}
                trackColor={{ false: "#333", true: Colors.PRIMARY }}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreateRoom}>
                <Text style={styles.createBtnText}>Create Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Member Modal */}
      <Modal visible={showAddMemberModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Member</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Partner</Text>
              <View style={styles.picker}>
                {candidatePartners.length === 0 ? (
                  <Text style={styles.emptyPickerText}>No accepted partners found</Text>
                ) : (
                  <ScrollView style={{ maxHeight: 150 }}>
                    {candidatePartners.map(p => (
                      <TouchableOpacity 
                        key={p.partnerOrgId} 
                        style={[styles.pickerItem, selectedPartnerOrgId === p.partnerOrgId && styles.pickerItemSelected]}
                        onPress={() => setSelectedPartnerOrgId(p.partnerOrgId)}
                      >
                        <Text style={[styles.pickerItemText, selectedPartnerOrgId === p.partnerOrgId && styles.pickerItemTextSelected]}>
                          {p.partnerOrg?.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Role</Text>
              <View style={styles.roleSelector}>
                {(["MEMBER", "READ_ONLY"] as const).map(role => (
                  <TouchableOpacity 
                    key={role} 
                    style={[styles.roleChip, selectedRole === role && styles.roleChipSelected]}
                    onPress={() => setSelectedRole(role)}
                  >
                    <Text style={[styles.roleChipText, selectedRole === role && styles.roleChipTextSelected]}>
                      {role === "MEMBER" ? "Member" : "Read-Only"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddMemberModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.createBtn, !selectedPartnerOrgId && { opacity: 0.5 }]} 
                onPress={handleAddMember}
                disabled={!selectedPartnerOrgId}
              >
                <Text style={styles.createBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG_DARK },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
  },
  backBtn: { marginRight: 16 },
  headerTitleGroup: { flex: 1 },
  title: { fontSize: 20, fontWeight: "800", color: Colors.TEXT_PRIMARY },
  subtitle: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 },
  newRoomBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  eventSelector: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.BORDER },
  label: { fontSize: 11, fontWeight: "700", color: Colors.TEXT_MUTED, textTransform: "uppercase", marginLeft: 20, marginBottom: 12 },
  eventScroll: { paddingLeft: 20 },
  eventChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, 
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    marginRight: 8,
  },
  eventChipSelected: { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY },
  eventChipText: { fontSize: 13, color: Colors.TEXT_SECONDARY, fontWeight: "600" },
  eventChipTextSelected: { color: "#FFF" },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  emptyState: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyText: { color: Colors.TEXT_MUTED, fontSize: 14 },
  
  roomCard: { 
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    padding: 16, marginBottom: 16, overflow: "hidden"
  },
  roomHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  roomTitleGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  roomIconWrapper: { 
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(59,130,246,0.1)",
    alignItems: "center", justifyContent: "center"
  },
  roomName: { fontSize: 16, fontWeight: "700", color: Colors.TEXT_PRIMARY },
  memberCount: { fontSize: 12, color: Colors.TEXT_SECONDARY, marginTop: 1 },
  
  memberList: { gap: 10, marginBottom: 16 },
  memberRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  memberInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  memberOrgName: { fontSize: 14, color: Colors.TEXT_SECONDARY, fontWeight: "500" },
  roleBadge: { transform: [{ scale: 0.85 }] },
  
  addMemberBtn: { 
    flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, 
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 12
  },
  addMemberBtnText: { color: Colors.PRIMARY, fontSize: 13, fontWeight: "700" },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 24, zIndex: 1000 },
  modalContent: { backgroundColor: "#1a1a2e", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.BORDER, opacity: 1, zIndex: 1001 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: Colors.TEXT_PRIMARY, marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: Colors.TEXT_MUTED, marginBottom: 8, textTransform: "uppercase" },
  inputWrapper: { 
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.BG_DARK, 
    borderRadius: 12, borderWidth: 1, borderColor: Colors.BORDER, paddingHorizontal: 16
  },
  prefix: { color: Colors.PRIMARY, fontSize: 18, fontWeight: "700", marginRight: 4 },
  textInput: { flex: 1, height: 48, color: Colors.TEXT_PRIMARY, fontSize: 16 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  switchText: { flex: 1 },
  switchLabel: { fontSize: 15, fontWeight: "600", color: Colors.TEXT_PRIMARY },
  switchSub: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 },
  modalActions: { flexDirection: "row", gap: 12 },
  cancelBtn: { 
    flex: 1, height: 48, alignItems: "center", justifyContent: "center", 
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.05)" 
  },
  cancelBtnText: { color: Colors.TEXT_PRIMARY, fontSize: 15, fontWeight: "600" },
  createBtn: { 
    flex: 2, height: 48, backgroundColor: Colors.PRIMARY, borderRadius: 12, 
    alignItems: "center", justifyContent: "center" 
  },
  createBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  
  picker: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", padding: 8 },
  pickerItem: { padding: 12, borderRadius: 8 },
  pickerItemSelected: { backgroundColor: "rgba(59,130,246,0.15)" },
  pickerItemText: { color: Colors.TEXT_PRIMARY, fontSize: 14 },
  pickerItemTextSelected: { color: Colors.PRIMARY, fontWeight: "700" },
  emptyPickerText: { color: Colors.TEXT_SECONDARY, textAlign: "center", padding: 20, fontSize: 13 },
  roleSelector: { flexDirection: "row", gap: 8 },
  roleChip: { 
    flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10, 
    backgroundColor: Colors.BG_DARK, borderWidth: 1, borderColor: Colors.BORDER 
  },
  roleChipSelected: { borderColor: Colors.PRIMARY, backgroundColor: "rgba(59,130,246,0.05)" },
  roleChipText: { color: Colors.TEXT_MUTED, fontSize: 13, fontWeight: "600" },
  roleChipTextSelected: { color: Colors.PRIMARY, fontWeight: "700" },
});

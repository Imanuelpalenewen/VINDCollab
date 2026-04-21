import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

interface PartnerOrg {
  _id: string;
  name: string;
}

interface AddTaskModalProps {
  visible: boolean;
  eventId: string;
  onClose: () => void;
  onTaskCreated: () => void;
  partnerOrgs: PartnerOrg[];
  onCreateTask: (taskData: {
    eventId: string;
    title: string;
    description?: string;
    phase?: string;
    priority?: "HIGH" | "MED" | "LOW";
    assignedOrgId?: string;
    estimatedHours?: number;
    dueDate?: number;
  }) => Promise<void>;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  eventId,
  onClose,
  onTaskCreated,
  partnerOrgs,
  onCreateTask,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState("");
  const [priority, setPriority] = useState<"HIGH" | "MED" | "LOW" | null>(null);
  const [assignedOrgId, setAssignedOrgId] = useState<string | null>(null);
  const [estimatedHours, setEstimatedHours] = useState("");
  const [dueDate, setDueDate] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState(""); 
  const [showOrgPicker, setShowOrgPicker] = useState(false);

  const assignedOrg = partnerOrgs.find((o) => o._id === assignedOrgId);

  const handleCreateTask = async () => {
    if (!title.trim()) {
      setTitleError("Task title is required");
      Alert.alert("Validation Error", "Please enter a task title");
      return;
    }
    setTitleError("");

    setLoading(true);
    try {
      await onCreateTask({
        eventId,
        title: title.trim(),
        description: description.trim() || undefined,
        phase: phase.trim() || undefined,
        priority: priority || undefined,
        assignedOrgId: assignedOrgId || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        dueDate,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setPhase("");
      setPriority(null);
      setAssignedOrgId(null);
      setEstimatedHours("");
      setDueDate(undefined);

      onTaskCreated();
      onClose();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create task"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.bottomSheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Task</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color={Colors.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Title - Required */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={{
                  backgroundColor: Colors.BG_INPUT,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: Colors.BORDER,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  color: Colors.TEXT_PRIMARY,
                  fontSize: 14,
                  fontWeight: "500",
                }}
                placeholder="Enter task title"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  setTitleError("");
                }}
                maxLength={100}
                editable={!loading}
              />
              {titleError ? (
                <Text style={{ color: Colors.ERROR, fontSize: 12, fontWeight: "600" }}>
                  {titleError}
                </Text>
              ) : null}
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Add task description..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={500}
                editable={!loading}
                placeholderTextColor={Colors.TEXT_MUTED}
              />
            </View>

            {/* Phase */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phase</Text>
              <Input
                placeholder="e.g., Planning, Design, Development"
                value={phase}
                onChangeText={setPhase}
                editable={!loading}
              />
            </View>

            {/* Priority Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityButtons}>
                {(["HIGH", "MED", "LOW"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      priority === p && styles.priorityButtonActive,
                    ]}
                    onPress={() => setPriority(priority === p ? null : p)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        priority === p && styles.priorityButtonTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Assigned Org */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Assign to Organization</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowOrgPicker(!showOrgPicker)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    !assignedOrgId && styles.dropdownPlaceholder,
                  ]}
                >
                  {assignedOrg
                    ? assignedOrg.name
                    : "Select organization (optional)"}
                </Text>
                <Ionicons
                  name={showOrgPicker ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.TEXT_SECONDARY}
                />
              </TouchableOpacity>

              {showOrgPicker && (
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      !assignedOrgId && styles.pickerItemActive,
                    ]}
                    onPress={() => {
                      setAssignedOrgId(null);
                      setShowOrgPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        !assignedOrgId && styles.pickerItemTextActive,
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {partnerOrgs.map((org) => (
                    <TouchableOpacity
                      key={org._id}
                      style={[
                        styles.pickerItem,
                        assignedOrgId === org._id && styles.pickerItemActive,
                      ]}
                      onPress={() => {
                        setAssignedOrgId(org._id);
                        setShowOrgPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          assignedOrgId === org._id &&
                            styles.pickerItemTextActive,
                        ]}
                      >
                        {org.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Estimated Hours */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Estimated Hours</Text>
              <Input
                placeholder="e.g., 8"
                value={estimatedHours}
                onChangeText={setEstimatedHours}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>

            {/* Due Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Due Date</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  dueDate ? styles.dropdownButtonActive : undefined,
                ]}
                onPress={() => {
                  // For MVP, use a simple date picker or allow manual entry
                  // You could integrate react-native-date-picker here
                  Alert.prompt(
                    "Set Due Date",
                    "Enter date in format YYYY-MM-DD",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "OK",
                        onPress: (text?: string) => {
                          if (text) {
                            const date = new Date(text);
                            if (!isNaN(date.getTime())) {
                              setDueDate(date.getTime());
                            } else {
                              Alert.alert("Invalid date", "Please enter a valid date");
                            }
                          }
                        },
                      },
                    ],
                    "plain-text"
                  );
                }}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    !dueDate && styles.dropdownPlaceholder,
                  ]}
                >
                  {dueDate
                    ? new Date(dueDate).toLocaleDateString()
                    : "Select due date (optional)"}
                </Text>
                <Ionicons
                  name="calendar"
                  size={18}
                  color={Colors.TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={handleClose}
              disabled={loading}
            />
            <Button
              title="Create Task"
              loading={loading}
              onPress={handleCreateTask}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: Colors.BG_DARK,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "85%",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.BG_CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textArea: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "500",
    minHeight: 80,
  },
  priorityButtons: {
    flexDirection: "row",
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
    alignItems: "center",
  },
  priorityButtonActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  priorityButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.TEXT_SECONDARY,
  },
  priorityButtonTextActive: {
    color: Colors.PRIMARY,
  },
  dropdownButton: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownButtonActive: {
    borderColor: Colors.PRIMARY,
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.TEXT_PRIMARY,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: Colors.TEXT_MUTED,
  },
  pickerContainer: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    marginTop: 6,
    overflow: "hidden",
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  pickerItemActive: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  pickerItemText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.TEXT_SECONDARY,
  },
  pickerItemTextActive: {
    color: Colors.PRIMARY,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
});

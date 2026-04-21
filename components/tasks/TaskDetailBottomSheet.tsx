import { Badge } from "@/components/ui/Badge";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority?: "HIGH" | "MED" | "LOW";
  assignedOrgName?: string;
  assignedOrgId?: string;
  dueDate?: number;
  estimatedHours?: number;
  phase?: string;
  isCritical?: boolean;
  eventId: string;
}

interface TaskDetailBottomSheetProps {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
  onStatusChange: (taskId: string, newStatus: "TODO" | "IN_PROGRESS" | "DONE") => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onEdit: () => void;
  isHost: boolean;
  myOrgId?: string;
}

export const TaskDetailBottomSheet: React.FC<TaskDetailBottomSheetProps> = ({
  task,
  visible,
  onClose,
  onStatusChange,
  onDelete,
  onEdit,
  isHost,
  myOrgId,
}) => {
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!task) return null;

  const handleStatusChange = async (newStatus: "TODO" | "IN_PROGRESS" | "DONE") => {
    if (task.status === newStatus) return;

    setLoadingStatus(newStatus);
    try {
      await onStatusChange(task._id, newStatus);
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to update task status");
    } finally {
      setLoadingStatus(null);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await onDelete(task._id);
              onClose();
            } catch (error) {
              Alert.alert("Error", "Failed to delete task");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority?: string): string => {
    switch (priority) {
      case "HIGH":
        return Colors.ERROR;
      case "MED":
        return Colors.WARNING;
      case "LOW":
        return Colors.SUCCESS;
      default:
        return Colors.TEXT_MUTED;
    }
  };

  const formatDate = (ms: number) => {
    const date = new Date(ms);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue =
    task.dueDate &&
    task.dueDate < new Date().getTime() &&
    task.status !== "DONE";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.bottomSheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {task.title}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={deleting}
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
            {/* Phase */}
            {task.phase && (
              <View style={styles.section}>
                <Text style={styles.label}>Phase</Text>
                <Text style={styles.value}>{task.phase}</Text>
              </View>
            )}

            {/* Description */}
            {task.description && (
              <View style={styles.section}>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.description}>{task.description}</Text>
              </View>
            )}

            {/* Assigned Org */}
            {task.assignedOrgName && (
              <View style={styles.section}>
                <Text style={styles.label}>Assigned To</Text>
                <Text style={styles.value}>👤 {task.assignedOrgName}</Text>
              </View>
            )}

            {/* Priority */}
            {task.priority && (
              <View style={styles.section}>
                <Text style={styles.label}>Priority</Text>
                <Badge
                  variant={
                    task.priority === "HIGH"
                      ? "red"
                      : task.priority === "MED"
                        ? "amber"
                        : "green"
                  }
                  label={task.priority}
                />
              </View>
            )}

            {/* Critical */}
            {task.isCritical && (
              <View style={styles.section}>
                <View style={styles.criticalBadge}>
                  <Ionicons name="flash" size={14} color={Colors.WARNING} />
                  <Text style={styles.criticalText}>Critical</Text>
                </View>
              </View>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <View style={styles.section}>
                <Text style={styles.label}>Due Date</Text>
                <Text
                  style={[
                    styles.value,
                    isOverdue ? styles.overdueText : undefined,
                  ]}
                >
                  📅 {formatDate(task.dueDate)}
                  {isOverdue && " (Overdue)"}
                </Text>
              </View>
            )}

            {/* Estimated Hours */}
            {task.estimatedHours && (
              <View style={styles.section}>
                <Text style={styles.label}>Estimated Hours</Text>
                <Text style={styles.value}>⏱️ {task.estimatedHours}h</Text>
              </View>
            )}

            {/* Status Selector */}
            <View style={styles.statusSection}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusButtons}>
                {(["TODO", "IN_PROGRESS", "DONE"] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      task.status === status && styles.statusButtonActive,
                    ]}
                    onPress={() => handleStatusChange(status)}
                    disabled={loadingStatus !== null || deleting}
                  >
                    {loadingStatus === status ? (
                      <ActivityIndicator
                        size="small"
                        color={Colors.PRIMARY}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.statusButtonText,
                          task.status === status && styles.statusButtonTextActive,
                        ]}
                      >
                        {status === "TODO"
                          ? "📋 To Do"
                          : status === "IN_PROGRESS"
                            ? "🔄 In Progress"
                            : "✅ Done"}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {(isHost || task.assignedOrgId === myOrgId) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={onEdit}
                disabled={deleting}
              >
                <Ionicons name="pencil" size={18} color={Colors.PRIMARY} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}

            {isHost && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={Colors.ERROR} />
                ) : (
                  <>
                    <Ionicons name="trash" size={18} color={Colors.ERROR} />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
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
    maxHeight: "80%",
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
    flex: 1,
    marginRight: 12,
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
  section: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT_PRIMARY,
  },
  description: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 18,
  },
  criticalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  criticalText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.WARNING,
  },
  overdueText: {
    color: Colors.ERROR,
    fontWeight: "700",
  },
  statusSection: {
    gap: 12,
    marginTop: 8,
  },
  statusButtons: {
    flexDirection: "row",
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  statusButtonActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.TEXT_SECONDARY,
  },
  statusButtonTextActive: {
    color: Colors.PRIMARY,
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
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  editButton: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.PRIMARY,
  },
  deleteButton: {
    borderColor: Colors.ERROR,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.ERROR,
  },
});

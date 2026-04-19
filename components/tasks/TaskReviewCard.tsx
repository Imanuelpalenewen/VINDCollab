import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority?: "HIGH" | "MED" | "LOW";
  isCritical?: boolean;
  estimatedHours?: number;
  dueDate?: number;
  aiRationale?: string;
  isAiGenerated?: boolean;
  assignedOrgId?: string;
  assignedOrgName?: string;
}

interface TaskReviewCardProps {
  task: Task;
  orgName: string;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const PRIORITY_CONFIG: Record<
  string,
  { color: string; bg: string; icon: string }
> = {
  HIGH: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", icon: "alert-circle" },
  MED: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", icon: "alert" },
  LOW: { color: "#10B981", bg: "rgba(16,185,129,0.1)", icon: "checkmark-circle" },
};

export default function TaskReviewCard({
  task,
  orgName,
  onEdit,
  onDelete,
}: TaskReviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  const priorityConfig = PRIORITY_CONFIG[task.priority ?? "MED"];

  const handleDelete = () => {
    Alert.alert(
      "Delete Task?",
      `Remove "${task.title}" from the breakdown?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(task._id),
        },
      ]
    );
  };

  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("id-ID", {
        month: "short",
        day: "numeric",
      })
    : "N/A";

  return (
    <View style={s.card}>
      {/* Header row */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{task.title}</Text>
          <View style={s.meta}>
            <Ionicons name="business" size={12} color={Colors.TEXT_MUTED} />
            <Text style={s.orgName}>{orgName}</Text>
            {task.estimatedHours && (
              <>
                <Text style={s.separator}>•</Text>
                <Ionicons name="time" size={12} color={Colors.TEXT_MUTED} />
                <Text style={s.hours}>{task.estimatedHours}h</Text>
              </>
            )}
            {task.dueDate && (
              <>
                <Text style={s.separator}>•</Text>
                <Ionicons name="calendar" size={12} color={Colors.TEXT_MUTED} />
                <Text style={s.dueDate}>{dueDateStr}</Text>
              </>
            )}
          </View>
        </View>

        {/* Priority badge + critical indicator */}
        <View style={s.rightSection}>
          {task.isCritical && (
            <View style={s.criticalBadge}>
              <Ionicons name="flash" size={12} color="#F59E0B" />
            </View>
          )}
          <View style={[s.priorityBadge, { backgroundColor: priorityConfig.bg }]}>
            <Ionicons
              name={priorityConfig.icon as any}
              size={12}
              color={priorityConfig.color}
            />
            <Text style={[s.priorityText, { color: priorityConfig.color }]}>
              {task.priority ?? "MED"}
            </Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {task.description && (
        <Text style={s.description}>{task.description}</Text>
      )}

      {/* Rationale (collapsible) */}
      {task.aiRationale && (
        <View>
          <TouchableOpacity
            style={s.rationaleToggle}
            onPress={() => setExpanded(!expanded)}
          >
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={Colors.TEXT_MUTED}
            />
            <Text style={s.rationaleLabel}>Why this assignment?</Text>
          </TouchableOpacity>
          {expanded && (
            <Text style={s.rationaleText}>{task.aiRationale}</Text>
          )}
        </View>
      )}

      {/* Action buttons */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => onEdit(task)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={14} color={Colors.PRIMARY} />
          <Text style={s.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={14} color={Colors.ERROR} />
          <Text style={s.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT_PRIMARY,
    marginBottom: 5,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  orgName: {
    fontSize: 11,
    color: Colors.PRIMARY,
    fontWeight: "500",
  },
  hours: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },
  separator: {
    color: Colors.TEXT_MUTED,
    marginHorizontal: 3,
  },
  dueDate: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },
  rightSection: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  criticalBadge: {
    width: 24,
    height: 24,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
  },
  description: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 18,
    marginTop: 4,
  },
  rationaleToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  rationaleLabel: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    fontWeight: "500",
  },
  rationaleText: {
    fontSize: 11,
    color: Colors.TEXT_SECONDARY,
    backgroundColor: "rgba(59,130,246,0.05)",
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 2,
    borderLeftColor: Colors.PRIMARY,
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    backgroundColor: "rgba(59,130,246,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.PRIMARY,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.ERROR,
  },
});

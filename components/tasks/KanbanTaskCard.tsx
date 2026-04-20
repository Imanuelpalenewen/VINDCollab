import { Badge } from "@/components/ui/Badge";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Task {
  _id: string;
  title: string;
  priority?: "HIGH" | "MED" | "LOW";
  assignedOrgName?: string;
  dueDate?: number;
  estimatedHours?: number;
  isCritical?: boolean;
  status: "TODO" | "IN_PROGRESS" | "DONE";
}

interface KanbanTaskCardProps {
  task: Task;
  onPress: () => void;
  onStatusChange: (newStatus: "TODO" | "IN_PROGRESS" | "DONE") => Promise<void>;
  onLongPress?: () => void;
  columnStatus: "TODO" | "IN_PROGRESS" | "DONE";
}

const statusOrder: Record<string, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  DONE: 2,
};

export const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({
  task,
  onPress,
  onStatusChange,
  onLongPress,
  columnStatus,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [loading, setLoading] = React.useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, { dx, dy }) => Math.abs(dx) > 10 || Math.abs(dy) > 10,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderRelease: async (evt, { dx, dy }) => {
        setIsDragging(false);

        const threshold = 50;
        const currentStatusIndex = statusOrder[task.status];

        // Horizontal swipe - move between statuses
        if (Math.abs(dx) > threshold && Math.abs(dy) < 30) {
          if (dx > threshold && currentStatusIndex > 0) {
            // Swipe right → move to previous status
            const statuses: Array<"TODO" | "IN_PROGRESS" | "DONE"> = [
              "TODO",
              "IN_PROGRESS",
              "DONE",
            ];
            const newStatus = statuses[currentStatusIndex - 1];
            try {
              setLoading(true);
              await onStatusChange(newStatus);
            } catch (error) {
              Alert.alert("Error", "Failed to move task");
            } finally {
              setLoading(false);
            }
          } else if (dx < -threshold && currentStatusIndex < 2) {
            // Swipe left → move to next status
            const statuses: Array<"TODO" | "IN_PROGRESS" | "DONE"> = [
              "TODO",
              "IN_PROGRESS",
              "DONE",
            ];
            const newStatus = statuses[currentStatusIndex + 1];
            try {
              setLoading(true);
              await onStatusChange(newStatus);
            } catch (error) {
              Alert.alert("Error", "Failed to move task");
            } finally {
              setLoading(false);
            }
          }
        }

        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

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

  const isOverdue =
    task.dueDate &&
    task.dueDate < new Date().getTime() &&
    task.status !== "DONE";

  const formatDate = (ms: number) => {
    const date = new Date(ms);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          opacity: isDragging ? 0.7 : 1,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={[
          styles.card,
          isOverdue ? styles.cardOverdue : undefined,
          isDragging ? styles.cardDragging : undefined,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        disabled={loading}
      >
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={Colors.PRIMARY} />
          </View>
        )}

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>

        {/* Meta row: Priority + Critical indicator */}
        <View style={styles.metaRow}>
          {task.priority && (
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
          )}
          {task.isCritical && (
            <Ionicons name="flash" size={14} color={Colors.WARNING} />
          )}
        </View>

        {/* Assigned org */}
        {task.assignedOrgName && (
          <Text style={styles.orgName} numberOfLines={1}>
            👤 {task.assignedOrgName}
          </Text>
        )}

        {/* Due date + estimated hours */}
        <View style={styles.footer}>
          {task.dueDate && (
            <Text
              style={[
                styles.footerText,
                isOverdue ? styles.overdueText : undefined,
              ]}
            >
              📅 {formatDate(task.dueDate)}
            </Text>
          )}
          {task.estimatedHours && (
            <Text style={styles.footerText}>
              ⏱️ {task.estimatedHours}h
            </Text>
          )}
        </View>

        {/* Swipe hint */}
        <Text style={styles.swipeHint}>
          {statusOrder[task.status] > 0 ? "← " : ""}
          {isDragging ? "Drag" : "Swipe"}
          {statusOrder[task.status] < 2 ? " →" : ""}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    width: "100%",
  },
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 12,
    gap: 8,
    position: "relative",
  },
  cardOverdue: {
    borderColor: Colors.ERROR,
    borderWidth: 1.5,
  },
  cardDragging: {
    borderColor: Colors.PRIMARY,
    borderWidth: 2,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  orgName: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  footerText: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    fontWeight: "500",
  },
  overdueText: {
    color: Colors.ERROR,
    fontWeight: "700",
  },
  swipeHint: {
    fontSize: 9,
    color: Colors.BORDER,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
});

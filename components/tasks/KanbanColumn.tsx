import { Badge } from "@/components/ui/Badge";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDragContext } from "./DragContext";
import { KanbanTaskCard } from "./KanbanTaskCard";

interface Task {
  _id: string;
  title: string;
  priority?: "HIGH" | "MED" | "LOW";
  assignedOrgName?: string;
  assignedOrgId?: string;
  dueDate?: number;
  estimatedHours?: number;
  isCritical?: boolean;
  status: "TODO" | "IN_PROGRESS" | "DONE";
}

interface KanbanColumnProps {
  status: "TODO" | "IN_PROGRESS" | "DONE";
  tasks: Task[];
  onTaskPress: (task: Task) => void;
  onTaskStatusChange: (
    taskId: string,
    newStatus: "TODO" | "IN_PROGRESS" | "DONE"
  ) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  onAddTask?: () => void;
  myOrgId?: string;
  isHost?: boolean;
}

const statusConfig = {
  TODO: {
    icon: "clipboard-outline" as const,
    iconColor: Colors.INFO,
    label: "To Do",
    color: Colors.INFO,
    emptyIcon: "clipboard-outline" as const,
    emptyTitle: "No tasks yet",
    emptyHint: "Tap + above to add a task",
    accentColor: Colors.INFO,
  },
  IN_PROGRESS: {
    icon: "time-outline" as const,
    iconColor: Colors.WARNING,
    label: "In Progress",
    color: Colors.WARNING,
    emptyIcon: "play-circle-outline" as const,
    emptyTitle: "Nothing in progress",
    emptyHint: "Hold & drag a To Do card to the right",
    accentColor: Colors.WARNING,
  },
  DONE: {
    icon: "checkmark-circle-outline" as const,
    iconColor: Colors.SUCCESS,
    label: "Done",
    color: Colors.SUCCESS,
    emptyIcon: "checkmark-done-circle-outline" as const,
    emptyTitle: "No completed tasks",
    emptyHint: "Hold & drag an In Progress card to the right",
    accentColor: Colors.SUCCESS,
  },
};

const CARD_HEIGHT = 120;

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onTaskPress,
  onTaskStatusChange,
  onTaskDelete,
  onAddTask,
  myOrgId,
  isHost,
}) => {
  const config = statusConfig[status];
  const isAddVisible = status === "TODO" && onAddTask;

  const listRef = useRef<FlatList<any>>(null);
  const {
    registerColumnRef,
    isDraggingTask,
    draggedTaskId,
    dragTranslationY,
  } = useDragContext();

  // Animated glow for drop zone
  const dropGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    registerColumnRef(status, listRef);
  }, [status, registerColumnRef]);

  useEffect(() => {
    if (isDraggingTask) {
      Animated.timing(dropGlow, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    } else {
      Animated.timing(dropGlow, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
  }, [isDraggingTask]);

  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  useEffect(() => {
    setLocalTasks((prev) => {
      const serverMap = new Map(tasks.map((t) => [t._id, t]));
      const serverIds = new Set(serverMap.keys());
      const localIds = new Set(prev.map((t) => t._id));

      const sameIds =
        serverIds.size === localIds.size &&
        [...serverIds].every((id) => localIds.has(id));

      if (sameIds) {
        return prev.map((t) => serverMap.get(t._id) ?? t);
      }

      return tasks;
    });
  }, [tasks]);

  const insertIndex = useMemo<number | null>(() => {
    if (!isDraggingTask || !draggedTaskId) return null;

    const sourceIdx = localTasks.findIndex((t) => t._id === draggedTaskId);
    if (sourceIdx === -1) return null;

    const delta = Math.round(dragTranslationY / CARD_HEIGHT);
    const target = Math.max(
      0,
      Math.min(localTasks.length - 1, sourceIdx + delta)
    );
    return target === sourceIdx ? null : target;
  }, [isDraggingTask, draggedTaskId, dragTranslationY, localTasks]);

  const handleReorder = useCallback((taskId: string, newIndex: number) => {
    setLocalTasks((prev) => {
      const oldIndex = prev.findIndex((t) => t._id === taskId);
      if (oldIndex === -1 || oldIndex === newIndex) return prev;
      const next = [...prev];
      const [item] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, item);
      return next;
    });
  }, []);

  const borderColor = dropGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.BORDER, config.accentColor + "80"],
  });

  const bgColor = dropGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(15, 23, 42, 0.6)", config.accentColor + "10"],
  });

  return (
    <Animated.View style={[styles.container, { borderColor, backgroundColor: bgColor }]}>
      {/* Accent bar at top */}
      <View style={[styles.accentBar, { backgroundColor: config.accentColor }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={[styles.iconWrap, { backgroundColor: config.accentColor + "20" }]}>
            <Ionicons name={config.icon} size={16} color={config.iconColor} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerLabel}>{config.label}</Text>
            <Badge
              variant={
                status === "TODO"
                  ? "default"
                  : status === "IN_PROGRESS"
                  ? "amber"
                  : "green"
              }
              label={`${localTasks.length}`}
            />
          </View>
        </View>
        {isAddVisible && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddTask}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color={Colors.PRIMARY} />
          </TouchableOpacity>
        )}
      </View>

      {/* Task list or empty state */}
      {localTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: config.accentColor + "15" }]}>
            <Ionicons name={config.emptyIcon} size={28} color={config.accentColor + "80"} />
          </View>
          <Text style={styles.emptyTitle}>{config.emptyTitle}</Text>
          <Text style={styles.emptyHint}>{config.emptyHint}</Text>

          {isAddVisible && (
            <TouchableOpacity style={styles.emptyAddBtn} onPress={onAddTask}>
              <Ionicons name="add-circle-outline" size={16} color={Colors.PRIMARY} />
              <Text style={styles.emptyAddText}>Add Task</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={localTasks}
          keyExtractor={(item) => item._id}
          scrollEnabled
          nestedScrollEnabled={false}
          contentContainerStyle={styles.listContent}
          scrollIndicatorInsets={{ right: -4 }}
          renderItem={({ item, index }) => (
            <>
              {insertIndex !== null && index === insertIndex && (
                <View style={styles.dropIndicator}>
                  <View style={styles.dropIndicatorDot} />
                  <View style={styles.dropIndicatorLine} />
                  <View style={styles.dropIndicatorDot} />
                </View>
              )}
              <KanbanTaskCard
                task={item}
                taskIndex={index}
                totalTasks={localTasks.length}
                columnStatus={status}
                canInteract={!!isHost || item.assignedOrgId === myOrgId}
                canDrag={true}
                onPress={() => onTaskPress(item)}
                onStatusChange={(newStatus) =>
                  onTaskStatusChange(item._id, newStatus)
                }
                onReorder={(newIndex) => handleReorder(item._id, newIndex)}
                onLongPress={() => onTaskPress(item)}
              />
            </>
          )}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 8,
    height: "100%",
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 10,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    fontWeight: "500",
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.PRIMARY + "60",
    backgroundColor: Colors.PRIMARY + "10",
  },
  emptyAddText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.PRIMARY,
  },
  dropIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  dropIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.PRIMARY,
  },
  dropIndicatorLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.PRIMARY,
    marginHorizontal: 4,
    borderRadius: 1,
  },
});
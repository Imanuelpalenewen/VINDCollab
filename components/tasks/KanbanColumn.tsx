import { Badge } from "@/components/ui/Badge";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { useDragContext } from "./DragContext";

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
  TODO: { emoji: "📋", label: "To Do", color: Colors.INFO },
  IN_PROGRESS: { emoji: "🔄", label: "In Progress", color: Colors.WARNING },
  DONE: { emoji: "✅", label: "Done", color: Colors.SUCCESS },
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

  useEffect(() => {
    registerColumnRef(status, listRef);
  }, [status, registerColumnRef]);

  // ── Local task order ───────────────────────────────────────────────────────
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  /**
   * KEY FIX — reorder not persisting:
   *
   * Old code synced localTasks from `tasks` whenever `isDraggingTask` changed.
   * When drag ended → isDraggingTask = false → effect ran → localTasks was
   * reset to server order, losing the reorder the user just did.
   *
   * New logic: sync from server only when the SET of task IDs changes
   * (tasks added or removed). If the IDs are the same, keep local order
   * but update task data (title, priority, etc.) from the server.
   */
  useEffect(() => {
    setLocalTasks((prev) => {
      const serverMap = new Map(tasks.map((t) => [t._id, t]));
      const serverIds = new Set(serverMap.keys());
      const localIds = new Set(prev.map((t) => t._id));

      const sameIds =
        serverIds.size === localIds.size &&
        [...serverIds].every((id) => localIds.has(id));

      if (sameIds) {
        // Same tasks — preserve local order, but refresh task data
        // (e.g., title or priority changed on the server)
        return prev.map((t) => serverMap.get(t._id) ?? t);
      }

      // Tasks were added or removed — reset to server order
      return tasks;
    });
  }, [tasks]);

  // ── Live drop indicator during drag ───────────────────────────────────────
  const insertIndex = useMemo<number | null>(() => {
    if (!isDraggingTask || !draggedTaskId) return null;

    const sourceIdx = localTasks.findIndex((t) => t._id === draggedTaskId);
    if (sourceIdx === -1) return null; // card is from a different column

    const delta = Math.round(dragTranslationY / CARD_HEIGHT);
    const target = Math.max(
      0,
      Math.min(localTasks.length - 1, sourceIdx + delta)
    );
    return target === sourceIdx ? null : target; // hide if no change
  }, [isDraggingTask, draggedTaskId, dragTranslationY, localTasks]);

  // ── Apply reorder on drop ─────────────────────────────────────────────────
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>{config.emoji}</Text>
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

      {/* Task list */}
      {localTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="layers-outline" size={32} color={Colors.BORDER} />
          <Text style={styles.emptyText}>No tasks</Text>
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
              {/* Drop indicator: shown above the target card while dragging */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 320,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 14,
    marginHorizontal: 8,
    height: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  headerEmoji: {
    fontSize: 20,
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
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    fontWeight: "500",
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
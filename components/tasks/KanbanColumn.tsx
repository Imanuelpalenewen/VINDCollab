import { Badge } from "@/components/ui/Badge";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { KanbanTaskCard } from "./KanbanTaskCard";
import { useDragContext } from "./DragContext";

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

interface KanbanColumnProps {
  status: "TODO" | "IN_PROGRESS" | "DONE";
  tasks: Task[];
  onTaskPress: (task: Task) => void;
  onTaskStatusChange: (taskId: string, newStatus: "TODO" | "IN_PROGRESS" | "DONE") => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  onAddTask?: () => void;
}

const statusConfig = {
  TODO: { emoji: "📋", label: "To Do", color: Colors.INFO },
  IN_PROGRESS: { emoji: "🔄", label: "In Progress", color: Colors.WARNING },
  DONE: { emoji: "✅", label: "Done", color: Colors.SUCCESS },
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onTaskPress,
  onTaskStatusChange,
  onTaskDelete,
  onAddTask,
}) => {
  const config = statusConfig[status];
  const isAddVisible = status === "TODO" && onAddTask;
  const { isDraggingTask } = useDragContext();

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
              label={`${tasks.length}`}
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

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="layers-outline" size={32} color={Colors.BORDER} />
          <Text style={styles.emptyText}>No tasks</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item._id}
          scrollEnabled={!isDraggingTask}
          renderItem={({ item }) => (
            <KanbanTaskCard
              key={item._id}
              task={item}
              columnStatus={status}
              onPress={() => onTaskPress(item)}
              onStatusChange={(newStatus) =>
                onTaskStatusChange(item._id, newStatus)
              }
              onLongPress={() => {
                onTaskPress(item);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          scrollIndicatorInsets={{ right: -4 }}
          nestedScrollEnabled={false}
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
  listScroll: {
    flex: 1,
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
});

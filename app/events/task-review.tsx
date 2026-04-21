import AIGeneratingLoader from "@/components/tasks/AIGeneratingLoader";
import PhaseAccordion from "@/components/tasks/PhaseAccordion";
import TaskEditModal from "@/components/tasks/TaskEditModal";
import { Colors } from "@/constants/Colors";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assignedOrgId?: string;
  priority?: "HIGH" | "MED" | "LOW";
  isCritical?: boolean;
  estimatedHours?: number;
  dueDate?: number;
  aiRationale?: string;
  phase?: string;
  assignedOrgName?: string;
}

interface Partner {
  _id: string;
  name: string;
}

export default function TaskReviewScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  if (!eventId) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>No event ID provided</Text>
      </View>
    );
  }

  const eId = eventId as Id<"events">;

  // Queries
  const pendingTasks = useQuery(api.tasks.getPendingApproval, { eventId: eId }) as Record<string, Task[]> | undefined;
  const partnerships = useQuery(api.partnerships.getByEvent, { eventId: eId }) as any[] | undefined;
  const event = useQuery(api.events.getById, { id: eId });

  // Actions & Mutations
  const generateTasksAction = useAction(api.tasks.generateTaskBreakdown);
  const updateTaskMutation = useMutation(api.tasks.updateTask as any);
  const deleteTaskMutation = useMutation(api.tasks.deleteTask as any);
  const approveAllMutation = useMutation(api.tasks.approveAllTasks as any);
  const approveTaskMutation = useMutation(api.tasks.approveTask as any);

  // Local state
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Compute partner map for friendly display
  const partnerMap = useMemo(() => {
    if (!partnerships) return {};
    const map: Record<string, string> = {};
    (partnerships as any[]).forEach((p: any) => {
      if (p.partnerOrg?._id) {
        map[p.partnerOrgId.toString()] = p.partnerOrg.name;
      }
    });
    return map;
  }, [partnerships]);

  // Compute task ID to org name map
  const taskToOrgMap = useMemo(() => {
    if (!pendingTasks) return {};
    const map: Record<string, string> = {};
    Object.values(pendingTasks as any).forEach((taskList: any) => {
      if (Array.isArray(taskList)) {
        taskList.forEach((task: any) => {
          map[task._id] = task.assignedOrgName ?? partnerMap[task.assignedOrgId?.toString() ?? ""] ?? "Unknown";
        });
      }
    });
    return map;
  }, [pendingTasks, partnerMap]);

  // Get partners for edit modal dropdown
  const partnerList = useMemo(() => {
    if (!partnerships) return [];
    return (partnerships as any[])
      .filter((p: any) => p.status === "ACCEPTED" && p.partnerOrg)
      .map((p: any) => ({
        _id: p.partnerOrgId.toString(),
        name: p.partnerOrg!.name,
      }));
  }, [partnerships]);

  const handleGenerateTasks = async () => {
    Alert.alert(
      "Generate AI Tasks?",
      "This will create a work breakdown structure based on your event and accepted partners.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Generate",
          onPress: async () => {
            setGenerating(true);
            try {
              const result = await generateTasksAction({
                eventId: eId,
                forceRefresh: false,
              });
              Alert.alert(
                "Success",
                `Generated ${result.taskCount} tasks in ${result.phaseCount} phases`
              );
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Failed to generate tasks");
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleSaveTaskEdit = async (updates: any) => {
    if (!editingTask) return;
    try {
      await updateTaskMutation({
        taskId: editingTask._id as Id<"tasks">,
        ...updates,
      });
      Alert.alert("Success", "Task updated");
      setEditingTask(null);
    } catch (err: any) {
      throw new Error(err.message ?? "Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeleting(taskId);
    try {
      await deleteTaskMutation({ taskId: taskId as Id<"tasks"> });
      Alert.alert("Success", "Task deleted");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to delete task");
    } finally {
      setDeleting(null);
    }
  };

  const handleApproveAll = () => {
    Alert.alert(
      "Approve All Tasks?",
      "All AI-generated tasks will be approved and added to your Kanban board.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve All",
          onPress: async () => {
            setApproving(true);
            try {
              await approveAllMutation({ eventId: eId });
              Alert.alert("Success", "Tasks berhasil dibuat! Lihat di Kanban Board.");
              router.back();
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Failed to approve tasks");
            } finally {
              setApproving(false);
            }
          },
        },
      ]
    );
  };

  // Loading states
  if (pendingTasks === undefined || partnerships === undefined) {
    return <AIGeneratingLoader />;
  }

  if (!event) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>Event not found</Text>
      </View>
    );
  }

  const taskCount = Object.values(pendingTasks).reduce(
    (sum, list) => sum + list.length,
    0
  );
  const hasNoTasks = taskCount === 0;

  if (generating) {
    return <AIGeneratingLoader />;
  }

  return (
    <SafeAreaView style={s.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.TEXT_SECONDARY} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Review Tasks</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Event info */}
        <View style={s.eventInfo}>
          <Text style={s.eventTitle}>{event.title}</Text>
          <Text style={s.eventMeta}>
            {Object.keys(pendingTasks).length} phases • {taskCount} tasks
          </Text>
        </View>

        {/* Content */}
        {hasNoTasks ? (
          <View style={s.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#C4B5FD" />
            <Text style={s.emptyTitle}>No tasks yet</Text>
            <Text style={s.emptyText}>
              AI will generate a work breakdown structure once you accept
              partners.
            </Text>
            <TouchableOpacity
              style={s.generateBtn}
              onPress={handleGenerateTasks}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={s.generateBtnText}>Generate AI Tasks</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Phases and tasks */}
            <View style={s.tasksSection}>
              {Object.entries(pendingTasks).map(([phase, tasks]) => (
                <PhaseAccordion
                  key={phase}
                  phase={phase}
                  tasks={tasks}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  partnerNames={taskToOrgMap}
                />
              ))}
            </View>

            {/* Regenerate button */}
            <TouchableOpacity
              style={s.regenerateBtn}
              onPress={handleGenerateTasks}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={16} color={Colors.PRIMARY} />
              <Text style={s.regenerateBtnText}>Regenerate Tasks</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bot action bar - only show if we have tasks */}
      {!hasNoTasks && (
        <View style={s.actionBar}>
          <TouchableOpacity
            style={s.approveAllBtn}
            onPress={handleApproveAll}
            disabled={approving}
            activeOpacity={0.85}
          >
            {approving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={18} color="#fff" />
                <Text style={s.approveAllBtnText}>Approve All Tasks</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Edit modal */}
      {editingTask && (
        <TaskEditModal
          isVisible={true}
          task={editingTask}
          partners={partnerList}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveTaskEdit}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.BG_DARK,
  },
  errorText: { color: Colors.ERROR, fontSize: 16 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },

  // Event info
  eventInfo: {
    marginBottom: 20,
    gap: 4,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  eventMeta: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
  },

  // Tasks section
  tasksSection: {
    marginBottom: 16,
    gap: 8,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.PRIMARY,
    marginTop: 8,
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Regenerate button
  regenerateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    marginBottom: 16,
  },
  regenerateBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.PRIMARY,
  },

  // Action bar
  actionBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    backgroundColor: Colors.BG_DARK,
  },
  approveAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.PRIMARY,
  },
  approveAllBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

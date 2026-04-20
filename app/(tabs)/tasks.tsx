import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { KanbanColumn } from "@/components/tasks/KanbanColumn";
import { TaskDetailBottomSheet } from "@/components/tasks/TaskDetailBottomSheet";
import { DragProvider, useDragContext } from "@/components/tasks/DragContext";
import TaskEditModal from "@/components/tasks/TaskEditModal";
import { Colors } from "@/constants/Colors";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import React, { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Event {
  _id: string;
  title: string;
  hostOrgId: string;
  status: string;
}

export default function TasksScreen() {
  // Router params
  const { selectedEventId: paramEventId } = useLocalSearchParams<{ selectedEventId: string }>();

  // Queries
  const myEvents = useQuery(api.events.listMyEvents) ?? [];

  // State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [editTaskVisible, setEditTaskVisible] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  // Auto-select event from router params
  useEffect(() => {
    if (paramEventId && !selectedEventId) {
      setSelectedEventId(paramEventId);
    }
  }, [paramEventId]);

  // Get Kanban tasks for selected event
  const kanbanData = useQuery(
    api.tasks.getKanbanByEvent,
    selectedEventId ? ({ eventId: selectedEventId as any }) : "skip"
  );

  // Get partnerships for selected event (to find partner orgs)
  const partnerships = useQuery(
    api.partnerships.getByEvent,
    selectedEventId ? ({ eventId: selectedEventId as any }) : "skip"
  );

  // Mutations
  const moveTaskMutation = useMutation(api.tasks.moveTask);
  const deleteTaskMutation = useMutation(api.tasks.deleteTask);
  const createTaskMutation = useMutation(api.tasks.createManualTask);
  const updateTaskMutation = useMutation(api.tasks.updateTask);

  // Get selected event
  const selectedEvent = selectedEventId
    ? myEvents.find((e: Event) => e._id === selectedEventId)
    : null;

  // Get all tasks across statuses for finding the selected task
  const allTasks =
    kanbanData && selectedEventId
      ? [
          ...(kanbanData.TODO || []),
          ...(kanbanData.IN_PROGRESS || []),
          ...(kanbanData.DONE || []),
        ]
      : [];

  const selectedTask = selectedTaskId
    ? allTasks.find((t) => t._id === selectedTaskId)
    : null;

  // Get partner orgs from partnerships
  const partnerOrgs =
    partnerships?.map((p: any) => ({
      _id: p.partnerOrgId,
      name: p.partnerOrg?.name || "Unknown",
    })) || [];

  // Handlers
  const handleMoveTask = useCallback(
    async (taskId: string, newStatus: "TODO" | "IN_PROGRESS" | "DONE") => {
      try {
        await moveTaskMutation({ taskId: taskId as any, newStatus });
      } catch (error) {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to move task"
        );
        throw error;
      }
    },
    [moveTaskMutation]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        await deleteTaskMutation({ taskId: taskId as any });
      } catch (error) {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to delete task"
        );
        throw error;
      }
    },
    [deleteTaskMutation]
  );

  const handleCreateTask = useCallback(
    async (taskData: {
      eventId: string;
      title: string;
      description?: string;
      phase?: string;
      priority?: "HIGH" | "MED" | "LOW";
      assignedOrgId?: string;
      estimatedHours?: number;
      dueDate?: number;
    }) => {
      try {
        await createTaskMutation({
          ...taskData,
          eventId: taskData.eventId as any,
          assignedOrgId: taskData.assignedOrgId as any,
        } as any);
      } catch (error) {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to create task"
        );
        throw error;
      }
    },
    [createTaskMutation]
  );

  const handleUpdateTask = useCallback(
    async (
      taskId: string,
      updates: {
        title?: string;
        assignedOrgId?: string;
        estimatedHours?: number;
        dueDate?: number;
        priority?: "HIGH" | "MED" | "LOW";
      }
    ) => {
      try {
        await updateTaskMutation({
          taskId: taskId as any,
          ...updates,
          assignedOrgId: updates.assignedOrgId as any,
        } as any);
      } catch (error) {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to update task"
        );
        throw error;
      }
    },
    [updateTaskMutation]
  );

  return (
    <DragProvider>
      <TasksScreenContent
        myEvents={myEvents}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
        selectedTaskId={selectedTaskId}
        setSelectedTaskId={setSelectedTaskId}
        kanbanData={kanbanData}
        partnerships={partnerships}
        selectedEvent={selectedEvent}
        allTasks={allTasks}
        selectedTask={selectedTask}
        partnerOrgs={partnerOrgs}
        handleMoveTask={handleMoveTask}
        handleDeleteTask={handleDeleteTask}
        handleCreateTask={handleCreateTask}
        handleUpdateTask={handleUpdateTask}
        addTaskVisible={addTaskVisible}
        setAddTaskVisible={setAddTaskVisible}
        editTaskVisible={editTaskVisible}
        setEditTaskVisible={setEditTaskVisible}
        editTaskId={editTaskId}
        setEditTaskId={setEditTaskId}
      />
    </DragProvider>
  );
}

interface TasksScreenContentProps {
  myEvents: Event[];
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  kanbanData: any;
  partnerships: any;
  selectedEvent: Event | null;
  allTasks: any[];
  selectedTask: any;
  partnerOrgs: any[];
  handleMoveTask: any;
  handleDeleteTask: any;
  handleCreateTask: any;
  handleUpdateTask: any;
  addTaskVisible: boolean;
  setAddTaskVisible: (v: boolean) => void;
  editTaskVisible: boolean;
  setEditTaskVisible: (v: boolean) => void;
  editTaskId: string | null;
  setEditTaskId: (id: string | null) => void;
}

function TasksScreenContent(props: TasksScreenContentProps) {
  const { isDraggingTask } = useDragContext();

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tasks</Text>
          <Ionicons name="checkmark-done-outline" size={24} color={Colors.PRIMARY} />
        </View>

        {/* Event Selector */}
        <View style={styles.eventSelectorContainer}>
          <Text style={styles.label}>Select Event</Text>
          <FlatList
            horizontal
            data={props.myEvents}
            keyExtractor={(e: Event) => e._id}
            scrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventList}
            renderItem={({ item: event }: { item: Event }) => (
              <TouchableOpacity
                style={[
                  styles.eventPill,
                  props.selectedEventId === event._id && styles.eventPillActive,
                ]}
                onPress={() => props.setSelectedEventId(event._id)}
              >
                <Text
                  style={[
                    styles.eventPillText,
                    props.selectedEventId === event._id && styles.eventPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {event.title}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Content */}
        {!props.selectedEventId || !props.kanbanData ? (
          <View style={styles.emptyContainer}>
            {!props.selectedEventId ? (
              <>
                <Ionicons name="calendar-outline" size={48} color={Colors.BORDER} />
                <Text style={styles.emptyTitle}>Pilih event untuk melihat tasks</Text>
                <Text style={styles.emptyText}>
                  Pilih salah satu event di atas untuk melihat kanban board
                </Text>
              </>
            ) : (
              <ActivityIndicator size="large" color={Colors.PRIMARY} />
            )}
          </View>
        ) : (
          <ScrollView
            horizontal
            style={styles.kanbanContainer}
            contentContainerStyle={styles.kanbanContent}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={!isDraggingTask}
          >
            <KanbanColumn
              status="TODO"
              tasks={props.kanbanData.TODO || []}
              onTaskPress={(task) => props.setSelectedTaskId(task._id)}
              onTaskStatusChange={props.handleMoveTask}
              onTaskDelete={props.handleDeleteTask}
              onAddTask={() => props.setAddTaskVisible(true)}
            />
            <KanbanColumn
              status="IN_PROGRESS"
              tasks={props.kanbanData.IN_PROGRESS || []}
              onTaskPress={(task) => props.setSelectedTaskId(task._id)}
              onTaskStatusChange={props.handleMoveTask}
              onTaskDelete={props.handleDeleteTask}
            />
            <KanbanColumn
              status="DONE"
              tasks={props.kanbanData.DONE || []}
              onTaskPress={(task) => props.setSelectedTaskId(task._id)}
              onTaskStatusChange={props.handleMoveTask}
              onTaskDelete={props.handleDeleteTask}
            />
          </ScrollView>
        )}
      </View>

      {/* Task Detail Bottom Sheet */}
      {props.selectedTask && (
        <TaskDetailBottomSheet
          task={props.selectedTask as any}
          visible={!!props.selectedTaskId}
          onClose={() => props.setSelectedTaskId(null)}
          onStatusChange={props.handleMoveTask}
          onDelete={props.handleDeleteTask}
          onEdit={() => {
            props.setEditTaskId(props.selectedTaskId);
            props.setEditTaskVisible(true);
            props.setSelectedTaskId(null);
          }}
        />
      )}

      {/* Add Task Modal */}
      {props.selectedEventId && (
        <AddTaskModal
          visible={props.addTaskVisible}
          eventId={props.selectedEventId}
          onClose={() => props.setAddTaskVisible(false)}
          onTaskCreated={() => props.setAddTaskVisible(false)}
          partnerOrgs={props.partnerOrgs}
          onCreateTask={props.handleCreateTask}
        />
      )}

      {/* Edit Task Modal */}
      {props.editTaskId && props.selectedEvent && props.selectedTask && (
        <TaskEditModal
          isVisible={props.editTaskVisible}
          task={props.selectedTask as any}
          partners={props.partnerOrgs}
          onClose={() => {
            props.setEditTaskVisible(false);
            props.setEditTaskId(null);
          }}
          onSave={async (updates) => {
            await props.handleUpdateTask(props.editTaskId, updates);
            props.setEditTaskVisible(false);
            props.setEditTaskId(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  eventSelectorContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  eventList: {
    gap: 8,
    paddingRight: 20,
  },
  eventPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
  },
  eventPillActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  eventPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  eventPillTextActive: {
    color: Colors.PRIMARY,
  },
  kanbanContainer: {
    flex: 1,
  },
  kanbanContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
    minHeight: "100%",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 18,
  },
});

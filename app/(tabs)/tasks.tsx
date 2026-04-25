import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { DragProvider, useDragContext } from "@/components/tasks/DragContext";
import { FeatureTipBanner } from "@/components/tasks/FeatureTipBanner";
import { KanbanColumn } from "@/components/tasks/KanbanColumn";
import { TaskDetailBottomSheet } from "@/components/tasks/TaskDetailBottomSheet";
import TaskEditModal from "@/components/tasks/TaskEditModal";
import { Colors } from "@/constants/Colors";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
  const { selectedEventId: paramEventId } = useLocalSearchParams<{ selectedEventId: string }>();

  const myEvents = (useQuery(api.events.listMyInvolvedEvents) ?? []).filter(Boolean) as Event[];
  const myOrg = useQuery(api.organizations.getMyOrg);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [editTaskVisible, setEditTaskVisible] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<any>(null);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    if (paramEventId && !selectedEventId) {
      setSelectedEventId(paramEventId);
    }
  }, [paramEventId]);

  // Show tips banner when an event is selected for the first time
  useEffect(() => {
    if (selectedEventId) {
      setShowTips(true);
    }
  }, [selectedEventId]);

  const kanbanData = useQuery(
    api.tasks.getKanbanByEvent,
    selectedEventId ? ({ eventId: selectedEventId as any }) : "skip"
  );

  const partnerships = useQuery(
    api.partnerships.getByEvent,
    selectedEventId ? ({ eventId: selectedEventId as any }) : "skip"
  );

  const moveTaskMutation = useMutation(api.tasks.moveTask);
  const deleteTaskMutation = useMutation(api.tasks.deleteTask);
  const createTaskMutation = useMutation(api.tasks.createManualTask);
  const updateTaskMutation = useMutation(api.tasks.updateTask);

  const selectedEvent = selectedEventId
    ? myEvents.find((e: Event) => e._id === selectedEventId)
    : null;

  const isHost = !!(selectedEvent && myOrg && selectedEvent.hostOrgId === myOrg._id);

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

  const partnerOrgs =
    partnerships?.map((p: any) => ({
      _id: p.partnerOrgId,
      name: p.partnerOrg?.name || "Unknown",
    })) || [];

  const handleMoveTask = useCallback(
    async (taskId: string, newStatus: "TODO" | "IN_PROGRESS" | "DONE") => {
      try {
        await moveTaskMutation({ taskId: taskId as any, newStatus });
      } catch (error) {
        Alert.alert("Error", error instanceof Error ? error.message : "Failed to move task");
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
        Alert.alert("Error", error instanceof Error ? error.message : "Failed to delete task");
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
        Alert.alert("Error", error instanceof Error ? error.message : "Failed to create task");
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
        Alert.alert("Error", error instanceof Error ? error.message : "Failed to update task");
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
        editTask={editTask}
        setEditTask={setEditTask}
        isHost={isHost}
        myOrg={myOrg}
        showTips={showTips}
        setShowTips={setShowTips}
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
  selectedEvent: Event | null | undefined;
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
  editTask: any;
  setEditTask: (task: any) => void;
  isHost: boolean;
  myOrg: any;
  showTips: boolean;
  setShowTips: (v: boolean) => void;
}

function TasksScreenContent(props: TasksScreenContentProps) {
  const totalTasks = props.allTasks.length;

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Tasks</Text>
            {props.selectedEvent && (
              <Text style={styles.eventSubtitle} numberOfLines={1}>
                {props.selectedEvent.title}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {/* Task count badge */}
            {totalTasks > 0 && (
              <View style={styles.taskCountBadge}>
                <Text style={styles.taskCountText}>{totalTasks}</Text>
              </View>
            )}
            <View style={styles.headerIcon}>
              <Ionicons name="checkmark-done-outline" size={22} color={Colors.PRIMARY} />
            </View>
          </View>
        </View>

        {/* Event Selector */}
        <View style={styles.eventSelectorContainer}>
          <Text style={styles.label}>
            <Ionicons name="calendar-outline" size={11} color={Colors.TEXT_MUTED} />
            {"  "}Select Event
          </Text>
          <FlatList
            horizontal
            data={props.myEvents}
            keyExtractor={(e: Event) => e._id}
            scrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventList}
            ListEmptyComponent={
              <View style={styles.noEventsPill}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.TEXT_MUTED} />
                <Text style={styles.noEventsText}>No events found</Text>
              </View>
            }
            renderItem={({ item: event }: { item: Event }) => (
              <TouchableOpacity
                style={[
                  styles.eventPill,
                  props.selectedEventId === event._id && styles.eventPillActive,
                ]}
                onPress={() => props.setSelectedEventId(event._id)}
              >
                {props.selectedEventId === event._id && (
                  <Ionicons name="checkmark-circle" size={13} color={Colors.PRIMARY} />
                )}
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

        {/* Feature tip banner — shown after event selected */}
        <FeatureTipBanner
          visible={props.showTips && !!props.selectedEventId}
          onDismiss={() => props.setShowTips(false)}
        />

        {/* Content */}
        {!props.selectedEventId ? (
          // No event selected state
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <View style={styles.emptyCircle}>
                <Ionicons name="calendar-outline" size={40} color={Colors.PRIMARY + "80"} />
              </View>
              {/* Mini kanban preview */}
              <View style={styles.emptyKanbanPreview}>
                {["To Do", "In Progress", "Done"].map((col, i) => (
                  <View key={i} style={styles.emptyKanbanCol}>
                    <View style={[styles.emptyKanbanHeader, { opacity: 0.4 + i * 0.2 }]} />
                    {[...Array(3 - i)].map((_, j) => (
                      <View key={j} style={[styles.emptyKanbanCard, { opacity: 0.2 + j * 0.1 }]} />
                    ))}
                  </View>
                ))}
              </View>
            </View>
            <Text style={styles.emptyTitle}>Select an event to view tasks</Text>
            <Text style={styles.emptyText}>
              Manage your team's work with a kanban board.{"\n"}
              Hold & drag cards to reorder or change status.
            </Text>

            {/* Mini tips preview */}
            <View style={styles.emptyTipsRow}>
              {[
                { icon: "arrow-forward-circle-outline" as const, text: "Hold & drag → change status" },
                { icon: "reorder-three-outline" as const, text: "Hold & drag ↕ reorder" },
              ].map((tip, i) => (
                <View key={i} style={styles.emptyTipChip}>
                  <Ionicons name={tip.icon} size={13} color={Colors.PRIMARY} />
                  <Text style={styles.emptyTipText}>{tip.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : !props.kanbanData ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={Colors.PRIMARY} />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            style={styles.kanbanContainer}
            contentContainerStyle={styles.kanbanContent}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={true}
          >
            <KanbanColumn
              status="TODO"
              tasks={props.kanbanData.TODO || []}
              onTaskPress={(task) => props.setSelectedTaskId(task._id)}
              onTaskStatusChange={props.handleMoveTask}
              onTaskDelete={props.handleDeleteTask}
              onAddTask={props.isHost ? () => props.setAddTaskVisible(true) : undefined}
              myOrgId={props.myOrg?._id}
              isHost={props.isHost}
            />
            <KanbanColumn
              status="IN_PROGRESS"
              tasks={props.kanbanData.IN_PROGRESS || []}
              onTaskPress={(task) => props.setSelectedTaskId(task._id)}
              onTaskStatusChange={props.handleMoveTask}
              onTaskDelete={props.handleDeleteTask}
              myOrgId={props.myOrg?._id}
              isHost={props.isHost}
            />
            <KanbanColumn
              status="DONE"
              tasks={props.kanbanData.DONE || []}
              onTaskPress={(task) => props.setSelectedTaskId(task._id)}
              onTaskStatusChange={props.handleMoveTask}
              onTaskDelete={props.handleDeleteTask}
              myOrgId={props.myOrg?._id}
              isHost={props.isHost}
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
            props.setEditTask(props.selectedTask);
            props.setEditTaskId(props.selectedTaskId);
            props.setEditTaskVisible(true);
            props.setSelectedTaskId(null);
          }}
          isHost={props.isHost}
          myOrgId={props.myOrg?._id}
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
      {props.editTaskId && props.selectedEvent && props.editTask && (
        <TaskEditModal
          isVisible={props.editTaskVisible}
          task={props.editTask}
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  eventSubtitle: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    fontWeight: "500",
    marginTop: 2,
    maxWidth: 200,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  taskCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.PRIMARY + "20",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.PRIMARY + "40",
  },
  taskCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.PRIMARY,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  eventSelectorContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  label: {
    fontSize: 11,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
  },
  eventPillActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  eventPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  eventPillTextActive: {
    color: Colors.PRIMARY,
  },
  noEventsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  noEventsText: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    fontWeight: "500",
  },
  kanbanContainer: {
    flex: 1,
  },
  kanbanContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    minHeight: "100%",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIllustration: {
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.PRIMARY + "10",
    borderWidth: 1,
    borderColor: Colors.PRIMARY + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  // Mini kanban preview skeleton
  emptyKanbanPreview: {
    flexDirection: "row",
    gap: 6,
  },
  emptyKanbanCol: {
    width: 52,
    gap: 4,
  },
  emptyKanbanHeader: {
    height: 8,
    backgroundColor: Colors.TEXT_MUTED,
    borderRadius: 4,
    marginBottom: 4,
  },
  emptyKanbanCard: {
    height: 20,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyTipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  emptyTipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.PRIMARY + "10",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.PRIMARY + "25",
  },
  emptyTipText: {
    fontSize: 11,
    color: Colors.PRIMARY,
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    fontWeight: "500",
    marginTop: 8,
  },
});
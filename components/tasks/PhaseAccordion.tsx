import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import TaskReviewCard from "./TaskReviewCard";

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

interface PhaseAccordionProps {
  phase: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  partnerNames: Record<string, string>;
}

export default function PhaseAccordion({
  phase,
  tasks,
  onEditTask,
  onDeleteTask,
  partnerNames,
}: PhaseAccordionProps) {
  const [expanded, setExpanded] = useState(true);

  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const criticalCount = tasks.filter((t) => t.isCritical).length;

  return (
    <View style={s.container}>
      {/* Header */}
      <TouchableOpacity
        style={s.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={s.headerLeft}>
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-forward"}
            size={18}
            color={Colors.PRIMARY}
          />
          <View>
            <Text style={s.phaseName}>{phase}</Text>
            <View style={s.phaseMeta}>
              <Text style={s.phaseMetaText}>{tasks.length} tasks</Text>
              {totalHours > 0 && (
                <>
                  <Text style={s.metaSeparator}>•</Text>
                  <Text style={s.phaseMetaText}>{totalHours}h est.</Text>
                </>
              )}
              {criticalCount > 0 && (
                <>
                  <Text style={s.metaSeparator}>•</Text>
                  <Ionicons name="flash" size={10} color="#F59E0B" />
                  <Text style={s.phaseMetaText}>{criticalCount} critical</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={s.badge}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={s.badgeText}>{tasks.length}</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Task list */}
      {expanded && (
        <View style={s.taskList}>
          {tasks.map((task) => (
            <TaskReviewCard
              key={task._id}
              task={task}
              orgName={partnerNames[task._id] ?? "Unknown Org"}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(59,130,246,0.05)",
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  phaseName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT_PRIMARY,
    marginBottom: 2,
  },
  phaseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  phaseMetaText: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },
  metaSeparator: {
    color: Colors.TEXT_MUTED,
    marginHorizontal: 2,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  taskList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
});

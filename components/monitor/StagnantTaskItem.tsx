import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface StagnantTask {
  taskId: string;
  title: string;
  statusSince: number;
  assignedOrgId: string;
}

interface StagnantTaskItemProps {
  task: StagnantTask;
  orgName?: string;
}

export const StagnantTaskItem: React.FC<StagnantTaskItemProps> = ({ task, orgName }) => {
  const hoursStuck = Math.floor(task.statusSince / (1000 * 60 * 60));
  const daysStuck = Math.floor(hoursStuck / 24);
  const timeLabel = daysStuck > 0 ? `${daysStuck}d ${hoursStuck % 24}h` : `${hoursStuck}h`;

  const urgencyColor =
    daysStuck >= 3 ? Colors.ERROR : daysStuck >= 1 ? Colors.WARNING : Colors.TEXT_MUTED;

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: urgencyColor }]} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{task.title}</Text>
        {orgName && (
          <View style={styles.orgRow}>
            <Ionicons name="business-outline" size={11} color={Colors.TEXT_MUTED} />
            <Text style={styles.org} numberOfLines={1}>{orgName}</Text>
          </View>
        )}
      </View>
      <View style={[styles.timeBadge, { borderColor: urgencyColor + "50" }]}>
        <Ionicons name="time-outline" size={11} color={urgencyColor} />
        <Text style={[styles.timeText, { color: urgencyColor }]}>{timeLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_PRIMARY,
  },
  orgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  org: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  timeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import React, { useState } from "react";
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

import { CircularProgress } from "@/components/charts/CircularProgress";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { HorizontalProgressBar } from "@/components/charts/HorizontalProgressBar";
import { Colors } from "@/constants/Colors";
import { api } from "@/convex/_generated/api";

interface Event {
  _id: string;
  title: string;
  hostOrgId: string;
  status: string;
}

export default function StatsScreen() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<"7d" | "14d" | "30d" | "all">("30d");

  const myEvents = (useQuery(api.events.listMyInvolvedEvents) ?? []).filter(
    Boolean
  ) as Event[];
  const myOrg = useQuery(api.organizations.getMyOrg);

  const report = useQuery(
    api.ai.progressMonitor.getProgressReport,
    selectedEventId ? { eventId: selectedEventId as any, timeRange: selectedTimeRange } : "skip"
  );

  const refreshMutation = useMutation(api.ai.progressMonitor.refreshProgressAnalysis);
  const feedbackMutation = useMutation(api.ai.progressMonitor.recordAlertFeedback);

  const selectedEvent = myEvents.find((e) => e._id === selectedEventId);
  const isHost = !!(selectedEvent && myOrg && selectedEvent.hostOrgId === myOrg._id);

  const handleRefresh = async () => {
    if (!selectedEventId || !isHost) return;
    setRefreshing(true);
    try {
      await refreshMutation({ eventId: selectedEventId as any });
      setTimeout(() => setRefreshing(false), 3000);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to refresh analysis");
      setRefreshing(false);
    }
  };

  const handleAlertFeedback = async (
    alertId: string,
    action: "ACKNOWLEDGED" | "DISMISSED"
  ) => {
    if (!report) return;
    await feedbackMutation({
      progressReportId: report._id as any,
      alertId,
      action,
    });
  };

  const formatDate = (ts?: number) => {
    if (!ts) return "N/A";
    return new Date(ts).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView style={s.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Analytics</Text>
          <Ionicons name="stats-chart" size={24} color={Colors.PRIMARY} />
        </View>

        {/* Event Selector */}
        <View style={s.selectorContainer}>
          <Text style={s.selectorLabel}>Select Event</Text>
          <FlatList
            horizontal
            data={myEvents}
            keyExtractor={(e: Event) => e._id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.eventList}
            renderItem={({ item }: { item: Event }) => (
              <TouchableOpacity
                style={[s.pill, selectedEventId === item._id && s.pillActive]}
                onPress={() => setSelectedEventId(item._id)}
              >
                <Text
                  style={[s.pillText, selectedEventId === item._id && s.pillTextActive]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Content */}
        {!selectedEventId ? (
          <View style={s.emptyContainer}>
            <Ionicons name="stats-chart-outline" size={48} color={Colors.BORDER} />
            <Text style={s.emptyTitle}>Pilih event untuk melihat analytics</Text>
            <Text style={s.emptyText}>
              Analisis progress, risk, dan performance team
            </Text>
          </View>
        ) : report === undefined ? (
          <View style={s.emptyContainer}>
            <ActivityIndicator size="large" color={Colors.PRIMARY} />
          </View>
        ) : report === null ? (
          <View style={s.emptyContainer}>
            <Ionicons name="analytics-outline" size={48} color={Colors.BORDER} />
            <Text style={s.emptyTitle}>Belum ada analisis</Text>
            <Text style={s.emptyText}>Generate analisis AI untuk melihat data</Text>
            {isHost && (
              <TouchableOpacity
                style={s.generateBtn}
                onPress={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={s.generateBtnInner}>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={s.generateBtnText}>Generate Analysis</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView
            style={s.flex}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Completion Circle */}
            <View style={s.section}>
              <View style={s.circleContainer}>
                <CircularProgress
                  percentage={report.completionRate}
                  size={200}
                  strokeWidth={14}
                  label="COMPLETE"
                />
              </View>
            </View>

            {/* Time Filters (7d, 14d, 30d, All) */}
            <View style={s.timeFilterWrapper}>
              <Text style={s.timeFilterLabel}>
                {selectedTimeRange === "7d" && "Last 7 Days"}
                {selectedTimeRange === "14d" && "Last 14 Days"}
                {selectedTimeRange === "30d" && "Last 30 Days"}
                {selectedTimeRange === "all" && "All Time"}
              </Text>
              <View style={s.timeFilterContainer}>
                {["7d", "14d", "30d", "all"].map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      s.timeFilter,
                      selectedTimeRange === filter && s.timeFilterActive,
                    ]}
                    onPress={() => setSelectedTimeRange(filter as any)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        s.timeFilterText,
                        selectedTimeRange === filter && s.timeFilterTextActive,
                      ]}
                    >
                      {filter === "all" ? "All" : filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Risk Score Card */}
            <View style={[s.card, s.section]}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>Risk Score</Text>
              </View>
              <View style={s.riskScoreContainer}>
                <GaugeChart
                  value={report.riskScore}
                  maxValue={100}
                  label="/100"
                  riskLevel={report.riskLevel as "GREEN" | "YELLOW" | "RED"}
                />
                <View style={s.riskDescription}>
                  <Text style={s.riskDescTitle}>
                    {report.riskLevel === "GREEN"
                      ? "Low Risk"
                      : report.riskLevel === "YELLOW"
                      ? "Moderate Risk"
                      : "High Risk"}
                  </Text>
                  <Text style={s.riskDescText}>
                    {report.riskLevel === "GREEN"
                      ? "Project is on track"
                      : report.riskLevel === "YELLOW"
                      ? "Velocity improvements needed in 2 teams"
                      : "Critical issues detected"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Projected Completion */}
            {report.predictedCompletionDate && (
              <View style={[s.card, s.section]}>
                <View style={s.alertBox}>
                  <Ionicons name="flag" size={20} color={Colors.SUCCESS} />
                  <View style={s.alertContent}>
                    <Text style={s.alertTitle}>
                      Projected: {Math.ceil((report.predictedCompletionDate - Date.now()) / (1000 * 60 * 60 * 24))} days late
                    </Text>
                    <Text style={s.alertDesc}>
                      Based on current velocity. Confidence: 78%
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Task Velocity Chart */}
            {report?.velocityData && (
              <View style={[s.card, s.section]}>
                <Text style={s.cardTitle}>Task Velocity (tasks/day)</Text>
                <View style={s.chartContainer}>
                  <BarChart data={report.velocityData} maxValue={10} height={200} />
                </View>
              </View>
            )}

            {/* Completion Over Time Chart */}
            {report?.completionData && (
              <View style={[s.card, s.section]}>
                <Text style={s.cardTitle}>Completion Over Time</Text>
                <View style={s.chartContainer}>
                  <LineChart
                    data={report.completionData}
                    height={200}
                  />
                </View>
              </View>
            )}

            {/* Organization Performance */}
            {report.blockedOrgResponseTime.length > 0 && (
              <View style={[s.card, s.section]}>
                <Text style={s.cardTitle}>Organization Performance</Text>
                <View style={s.performanceList}>
                  {report.blockedOrgResponseTime.map((org: any, index: number) => (
                    <View key={index} style={s.performanceItem}>
                      <View style={s.orgBadge}>
                        <Text style={s.orgBadgeText}>
                          {org.orgName?.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.orgName}>{org.orgName}</Text>
                        <HorizontalProgressBar
                          label=""
                          value={`${Math.round(org.avgResponseTime / 3600000)}h`}
                          percentage={Math.min(
                            (org.avgResponseTime / (1000 * 60 * 60 * 24)) * 100,
                            100
                          )}
                          color={
                            org.isUnresponsive ? Colors.ERROR : Colors.SUCCESS
                          }
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Milestone Progress */}
            {report?.milestoneProgress && report.milestoneProgress.length > 0 && (
              <View style={[s.card, s.section]}>
                <Text style={s.cardTitle}>Task Progress by Phase</Text>
                <View style={s.milestoneList}>
                  {report.milestoneProgress.map((milestone: any, index: number) => (
                    <View key={index} style={s.milestoneItem}>
                      <HorizontalProgressBar
                        label={milestone.name}
                        value=""
                        percentage={milestone.progress}
                        color={
                          milestone.progress >= 70
                            ? Colors.SUCCESS
                            : milestone.progress >= 40
                            ? Colors.WARNING
                            : "#EF9A9A"
                        }
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Stagnant Tasks */}
            {report?.stagnantTasks && report.stagnantTasks.length > 0 && (
              <View style={[s.card, s.section]}>
                <View style={s.sectionHeader}>
                  <Ionicons name="pause-circle" size={16} color={Colors.WARNING} />
                  <Text style={s.cardTitle}>Stagnant Tasks ({report.stagnantTasks.length})</Text>
                </View>
                <View style={s.stagnantList}>
                  {report.stagnantTasks.slice(0, 5).map((task: any, index: number) => (
                    <View key={index} style={s.stagnantItem}>
                      <View>
                        <Text style={s.taskTitle}>{task.title}</Text>
                        <Text style={s.taskMeta}>
                          Stuck for: {Math.round(task.statusSince / (1000 * 60 * 60))}h
                        </Text>
                      </View>
                      <Text style={s.taskOrg}>{task.assignedOrgName}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },
  container: { flex: 1, backgroundColor: Colors.BG_DARK },

  // Header
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

  // Event Selector
  selectorContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  eventList: { gap: 8, paddingRight: 20 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
  },
  pillActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "rgba(59,130,246,0.2)",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  pillTextActive: { color: Colors.PRIMARY },

  // Time Filters
  timeFilterWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  timeFilterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  timeFilterContainer: {
    flexDirection: "row",
    gap: 8,
  },
  timeFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: "transparent",
  },
  timeFilterActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: Colors.PRIMARY,
  },
  timeFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.TEXT_SECONDARY,
  },
  timeFilterTextActive: {
    color: "#fff",
  },

  // Sections
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  section: {
    gap: 12,
  },

  // Circular Progress Container
  circleContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },

  // Card
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },

  // Risk Score
  riskScoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  riskDescription: {
    flex: 1,
    gap: 4,
  },
  riskDescTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  riskDescText: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    lineHeight: 16,
  },

  // Alert Box
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(16,185,129,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    padding: 12,
  },
  alertContent: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  alertDesc: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },

  // Charts
  chartContainer: {
    paddingVertical: 12,
  },

  // Organization Performance
  performanceList: {
    gap: 12,
  },
  performanceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  orgBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  orgBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  orgName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_PRIMARY,
    marginBottom: 6,
  },

  // Milestones
  milestoneList: {
    gap: 14,
  },
  milestoneItem: {
    paddingVertical: 4,
  },

  // Stagnant Tasks
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  stagnantList: {
    gap: 8,
  },
  stagnantItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.WARNING,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_PRIMARY,
  },
  taskMeta: {
    fontSize: 10,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
  },
  taskOrg: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.TEXT_SECONDARY,
  },

  // Empty
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
  generateBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.PRIMARY,
    marginTop: 8,
  },
  generateBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});

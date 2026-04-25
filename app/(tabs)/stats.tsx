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

import { AnalyticsInfoCard } from "@/components/charts/AnalyticsInfoCard";
import { AnalyticsModal } from "@/components/charts/AnalyticsModal";
import { CircularProgress } from "@/components/charts/CircularProgress";
import { HorizontalProgressBar } from "@/components/charts/HorizontalProgressBar";
import { InteractiveBarChart } from "@/components/charts/InteractiveBarChart";
import { InteractiveGaugeChart } from "@/components/charts/InteractiveGaugeChart";
import { InteractiveLineChart } from "@/components/charts/InteractiveLineChart";
import { Colors } from "@/constants/Colors";
import { api } from "@/convex/_generated/api";

interface Event {
  _id: string;
  title: string;
  hostOrgId: string;
  status: string;
}

const TIME_RANGES = [
  { key: "7d", label: "7 Days" },
  { key: "14d", label: "14 Days" },
  { key: "30d", label: "30 Days" },
  { key: "all", label: "All Time" },
] as const;

// ─── Section Header component ─────────────────────────────────────────────────
const SectionHeader = ({
  icon,
  iconColor,
  title,
  subtitle,
  badge,
}: {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  badge?: string;
}) => (
  <View style={sh.wrapper}>
    <View style={[sh.iconBox, { backgroundColor: `${iconColor}18` }]}>
      <Ionicons name={icon as any} size={16} color={iconColor} />
    </View>
    <View style={sh.text}>
      <View style={sh.titleRow}>
        <Text style={sh.title}>{title}</Text>
        {badge && (
          <View style={sh.badge}>
            <Text style={sh.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={sh.subtitle}>{subtitle}</Text>
    </View>
  </View>
);

const sh = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  text: { flex: 1, gap: 2 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(255,255,255,0.9)",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: "rgba(59,130,246,0.2)",
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.PRIMARY,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.38)",
    lineHeight: 15,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<"7d" | "14d" | "30d" | "all">("30d");

  const [riskModalVisible, setRiskModalVisible] = useState(false);
  const [velocityModalVisible, setVelocityModalVisible] = useState(false);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [selectedBarData, setSelectedBarData] = useState<any>(null);
  const [selectedLineData, setSelectedLineData] = useState<any>(null);

  const myEvents = (useQuery(api.events.listMyInvolvedEvents) ?? []).filter(Boolean) as Event[];
  const myOrg = useQuery(api.organizations.getMyOrg);

  const report = useQuery(
    api.ai.progressMonitor.getProgressReport,
    selectedEventId
      ? { eventId: selectedEventId as any, timeRange: selectedTimeRange }
      : "skip"
  );

  const refreshMutation = useMutation(api.ai.progressMonitor.refreshProgressAnalysis);

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

  return (
    <SafeAreaView style={s.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />
      <View style={s.container}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Analytics</Text>
            <Text style={s.subtitle}>Performance & Progress Tracking</Text>
          </View>
          <View style={s.headerIcon}>
            <Ionicons name="stats-chart" size={20} color={Colors.PRIMARY} />
          </View>
        </View>

        {/* ── Event Selector ── */}
        <View style={s.selectorContainer}>
          <Text style={s.selectorLabel}>Select Event to Analyze</Text>
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

        {/* ── Empty / Loading / Content ── */}
        {!selectedEventId ? (
          <View style={s.emptyContainer}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="bar-chart-outline" size={40} color="rgba(255,255,255,0.15)" />
            </View>
            <Text style={s.emptyTitle}>Select an Event</Text>
            <Text style={s.emptyText}>
              Choose an event above to see detailed analytics — completion rate, velocity, risk assessment, and team performance.
            </Text>
          </View>
        ) : report === undefined ? (
          <View style={s.emptyContainer}>
            <ActivityIndicator size="large" color={Colors.PRIMARY} />
            <Text style={s.loadingText}>Loading analytics…</Text>
          </View>
        ) : report === null ? (
          <View style={s.emptyContainer}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="analytics-outline" size={40} color="rgba(255,255,255,0.15)" />
            </View>
            <Text style={s.emptyTitle}>No Analysis Yet</Text>
            <Text style={s.emptyText}>
              Generate an AI analysis to see task velocity, risk score, team performance, and completion forecasts.
            </Text>
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
                    <Text style={s.generateBtnText}>Generate AI Analysis</Text>
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
            {/* ── How to use tip ── */}
            <View style={s.tipBanner}>
              <Ionicons name="bulb-outline" size={14} color="#F59E0B" />
              <Text style={s.tipText}>
                <Text style={s.tipBold}>How to use: </Text>
                Tap any chart or card to see detailed data. Use the time filter to compare different periods.
              </Text>
            </View>

            {/* ── Overall Completion ── */}
            <View style={s.card}>
              <SectionHeader
                icon="checkmark-done-circle"
                iconColor="#10B981"
                title="Overall Completion"
                subtitle="Percentage of all tasks completed across the event"
              />
              <View style={s.completionWrapper}>
                <CircularProgress
                  percentage={report.completionRate}
                  size={200}
                  strokeWidth={14}
                  label="COMPLETE"
                />
              </View>
            </View>

            {/* ── Time Range Filter ── */}
            <View style={s.filterCard}>
              <View style={s.filterHeaderRow}>
                <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.4)" />
                <Text style={s.filterTitle}>Time Range</Text>
                <Text style={s.filterActive}>
                  {TIME_RANGES.find((r) => r.key === selectedTimeRange)?.label}
                </Text>
              </View>
              <Text style={s.filterHint}>
                Charts below will update based on the selected range
              </Text>
              <View style={s.filterRow}>
                {TIME_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range.key}
                    style={[
                      s.filterBtn,
                      selectedTimeRange === range.key && s.filterBtnActive,
                    ]}
                    onPress={() => setSelectedTimeRange(range.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        s.filterBtnText,
                        selectedTimeRange === range.key && s.filterBtnTextActive,
                      ]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Risk Assessment ── */}
            <View style={s.card}>
              <SectionHeader
                icon="shield-half-outline"
                iconColor="#F59E0B"
                title="Risk Assessment"
                subtitle="Calculated from team velocity, blocked tasks, and milestone progress. Tap for full breakdown."
              />
              <TouchableOpacity
                onPress={() => setRiskModalVisible(true)}
                activeOpacity={0.85}
              >
                <InteractiveGaugeChart
                  value={report.riskScore}
                  maxValue={100}
                  label="RISK SCORE"
                  riskLevel={report.riskLevel as "GREEN" | "YELLOW" | "RED"}
                  description={
                    report.riskLevel === "GREEN"
                      ? "Project is running smoothly with no critical blockers."
                      : report.riskLevel === "YELLOW"
                      ? "Some teams need velocity improvement — moderate risk."
                      : "Critical issues require immediate attention."
                  }
                  recommendations={
                    report.riskLevel === "GREEN"
                      ? ["Maintain current pace", "Monitor velocity weekly"]
                      : report.riskLevel === "YELLOW"
                      ? [
                          "Boost velocity in lagging teams",
                          "Identify and remove blockers",
                          "Reallocate resources if needed",
                        ]
                      : [
                          "Immediately address blocked tasks",
                          "Improve cross-team communication",
                          "Consider timeline adjustment",
                        ]
                  }
                  onPress={() => setRiskModalVisible(true)}
                />
              </TouchableOpacity>
            </View>

            {/* ── Projected Completion ── */}
            {report.predictedCompletionDate && (
              <View style={s.card}>
                <SectionHeader
                  icon="flag-outline"
                  iconColor={Colors.PRIMARY}
                  title="Projected Completion"
                  subtitle="Estimated finish date based on current team velocity"
                />
                <AnalyticsInfoCard
                  title="Completion Forecast"
                  icon="time-outline"
                  description="Projection calculated from task completion rate over the selected period."
                  details={[
                    {
                      label: "Days Until Finish",
                      value: Math.max(
                        0,
                        Math.ceil(
                          (report.predictedCompletionDate - Date.now()) /
                            (1000 * 60 * 60 * 24)
                        )
                      ),
                      unit: "days",
                    },
                    {
                      label: "Forecast Confidence",
                      value: "78",
                      unit: "%",
                    },
                  ]}
                  accentColor={Colors.PRIMARY}
                />
              </View>
            )}

            {/* ── Task Velocity ── */}
            {report?.velocityData && (
              <View style={s.card}>
                <SectionHeader
                  icon="trending-up-outline"
                  iconColor={Colors.INFO}
                  title="Daily Task Velocity"
                  subtitle="Number of tasks completed each day. Higher bars = more productive days. Tap a bar to inspect."
                />
                <View style={s.chartBox}>
                  <InteractiveBarChart
                    data={report.velocityData.map((v: any) => ({
                      ...v,
                      tooltip: `${v.value} tasks completed on ${v.label}`,
                    }))}
                    height={240}
                    yAxisLabel="Tasks / day"
                    onBarPress={(index, data) => {
                      setSelectedBarData(data);
                      setVelocityModalVisible(true);
                    }}
                  />
                </View>
              </View>
            )}

            {/* ── Completion Over Time ── */}
            {report?.completionData && (
              <View style={s.card}>
                <SectionHeader
                  icon="analytics-outline"
                  iconColor={Colors.INFO}
                  title="Completion Progress"
                  subtitle="How overall task completion % has changed over time. A rising line means steady progress. Tap any point to inspect."
                />
                <View style={s.chartBox}>
                  <InteractiveLineChart
                    data={report.completionData.map((c: any) => ({
                      ...c,
                      tooltip: `${c.value}% complete as of ${c.label}`,
                    }))}
                    height={240}
                    yAxisLabel="Completion"
                    unit="%"
                    onDataPointPress={(index, data) => {
                      setSelectedLineData(data);
                      setCompletionModalVisible(true);
                    }}
                  />
                </View>
              </View>
            )}

            {/* ── Team Performance ── */}
            {report.blockedOrgResponseTime?.length > 0 && (
              <View style={s.card}>
                <SectionHeader
                  icon="people-outline"
                  iconColor="#A78BFA"
                  title="Team Response Time"
                  subtitle="How fast each team resolves assigned tasks. Shorter response time = more efficient."
                />
                <View style={s.teamList}>
                  {report.blockedOrgResponseTime.map((org: any, index: number) => (
                    <View key={index} style={s.teamItem}>
                      <View style={s.teamRow}>
                        <View style={s.teamAvatar}>
                          <Text style={s.teamAvatarText}>
                            {org.orgName?.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.teamName}>{org.orgName}</Text>
                          <HorizontalProgressBar
                            label=""
                            value={`Avg ${Math.round(org.avgResponseTime / 3600000)}h response`}
                            percentage={Math.min(
                              (org.avgResponseTime / (1000 * 60 * 60 * 24)) * 100,
                              100
                            )}
                            color={org.isUnresponsive ? "#EF4444" : "#10B981"}
                            showLabel={false}
                          />
                        </View>
                      </View>
                      {org.isUnresponsive && (
                        <View style={s.delayedTag}>
                          <Ionicons name="warning-outline" size={11} color="#EF4444" />
                          <Text style={s.delayedText}>Delayed — needs follow-up</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── Phase Progress ── */}
            {report?.milestoneProgress?.length > 0 && (
              <View style={s.card}>
                <SectionHeader
                  icon="layers-outline"
                  iconColor="#10B981"
                  title="Phase Progress"
                  subtitle="Completion percentage for each event phase. All phases must reach 100% for the event to be complete."
                />
                <View style={s.phaseList}>
                  {report.milestoneProgress.map((m: any, i: number) => (
                    <View key={i} style={s.phaseItem}>
                      <HorizontalProgressBar
                        label={m.name}
                        value=""
                        percentage={m.progress}
                        color={
                          m.progress >= 70
                            ? "#10B981"
                            : m.progress >= 40
                            ? "#F59E0B"
                            : "#EF4444"
                        }
                        showLabel={true}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── Stagnant Tasks ── */}
            {report?.stagnantTasks?.length > 0 && (
              <View style={s.card}>
                <SectionHeader
                  icon="pause-circle-outline"
                  iconColor="#F87171"
                  title="Stagnant Tasks"
                  subtitle="Tasks with no progress for an extended period. These need immediate action to unblock."
                  badge={`${report.stagnantTasks.length} tasks`}
                />
                <View style={s.stagnantList}>
                  {report.stagnantTasks.slice(0, 5).map((task: any, i: number) => (
                    <View key={i} style={s.stagnantItem}>
                      <View style={s.stagnantIcon}>
                        <Ionicons name="alert-circle" size={14} color="#F87171" />
                      </View>
                      <View style={s.stagnantBody}>
                        <Text style={s.stagnantTitle}>{task.title}</Text>
                        <Text style={s.stagnantMeta}>
                          Stuck for {Math.round(task.statusSince / (1000 * 60 * 60))}h
                          {" · "}
                          {task.assignedOrgName}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {report.stagnantTasks.length > 5 && (
                    <Text style={s.stagnantMore}>
                      +{report.stagnantTasks.length - 5} more stagnant tasks
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* ── Refresh ── */}
            {isHost && (
              <View style={s.refreshSection}>
                <TouchableOpacity
                  style={s.refreshBtn}
                  onPress={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color={Colors.PRIMARY} />
                  ) : (
                    <View style={s.refreshBtnInner}>
                      <Ionicons name="refresh" size={16} color={Colors.PRIMARY} />
                      <Text style={s.refreshBtnText}>Refresh Analysis</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={s.refreshHint}>
                  Re-run AI analysis to get the latest data
                </Text>
              </View>
            )}

            <View style={{ height: 48 }} />
          </ScrollView>
        )}

        {/* ── Modals ── */}
        <AnalyticsModal
          visible={riskModalVisible}
          title="Risk Score Breakdown"
          description="Detailed factors that contribute to the overall project risk"
          icon="shield-half"
          accentColor="#F59E0B"
          data={[
            {
              label: "Overall Risk Score",
              value: report?.riskScore ?? 0,
              unit: "/ 100",
              tooltip: "Composite score — lower is better",
              highlight: true,
            },
            {
              label: "Risk Level",
              value:
                report?.riskLevel === "GREEN"
                  ? "Low Risk"
                  : report?.riskLevel === "YELLOW"
                  ? "Moderate Risk"
                  : "High Risk",
              tooltip: "Classification based on the score range",
            },
            {
              label: "Stagnant Tasks",
              value: report?.stagnantTasks?.length ?? 0,
              unit: "tasks",
              tooltip: "Tasks with no activity for an extended time",
            },
            {
              label: "Delayed Teams",
              value:
                report?.blockedOrgResponseTime?.filter(
                  (o: any) => o.isUnresponsive
                ).length ?? 0,
              unit: "teams",
              tooltip: "Teams with slower-than-expected task response",
            },
          ]}
          onClose={() => setRiskModalVisible(false)}
        />

        <AnalyticsModal
          visible={velocityModalVisible && !!selectedBarData}
          title="Velocity Detail"
          description="Task completion data for the selected day"
          icon="trending-up"
          accentColor={Colors.INFO}
          data={[
            {
              label: "Date",
              value: selectedBarData?.label ?? "—",
              tooltip: "The date of this data point",
            },
            {
              label: "Tasks Completed",
              value: selectedBarData?.value ?? 0,
              unit: "tasks",
              tooltip: "Number of tasks marked done on this day",
              highlight: true,
            },
            {
              label: "Productivity Level",
              value:
                (selectedBarData?.value ?? 0) >= 7
                  ? "High"
                  : (selectedBarData?.value ?? 0) >= 4
                  ? "Medium"
                  : "Low",
              tooltip: "Based on daily completion count",
            },
          ]}
          onClose={() => {
            setVelocityModalVisible(false);
            setSelectedBarData(null);
          }}
        />

        <AnalyticsModal
          visible={completionModalVisible && !!selectedLineData}
          title="Completion Detail"
          description="Completion progress for the selected date"
          icon="analytics"
          accentColor={Colors.INFO}
          data={[
            {
              label: "Date",
              value: selectedLineData?.label ?? "—",
              tooltip: "The date of this data point",
            },
            {
              label: "Completion Rate",
              value: selectedLineData?.value ?? 0,
              unit: "%",
              tooltip: "Percentage of tasks completed by this date",
              highlight: true,
            },
            {
              label: "Remaining Work",
              value: (100 - (selectedLineData?.value ?? 0)).toFixed(1),
              unit: "%",
              tooltip: "Work still left to complete",
            },
          ]}
          onClose={() => {
            setCompletionModalVisible(false);
            setSelectedLineData(null);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },
  container: { flex: 1, backgroundColor: Colors.BG_DARK },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 3,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Event selector
  selectorContainer: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  eventList: { gap: 8, paddingRight: 20 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  pillActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "rgba(59,130,246,0.18)",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
  },
  pillTextActive: { color: Colors.PRIMARY, fontWeight: "700" },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },

  // Tip banner
  tipBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    backgroundColor: "rgba(245,158,11,0.07)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 16,
  },
  tipBold: {
    fontWeight: "700",
    color: "#F59E0B",
  },

  // Card wrapper
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    gap: 14,
  },

  // Completion
  completionWrapper: {
    alignItems: "center",
    paddingVertical: 8,
  },

  // Time filter
  filterCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    gap: 8,
  },
  filterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
  },
  filterActive: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.PRIMARY,
  },
  filterHint: {
    fontSize: 10,
    color: "rgba(255,255,255,0.25)",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  filterBtnActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: Colors.PRIMARY,
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.45)",
  },
  filterBtnTextActive: { color: "#fff" },

  // Chart box
  chartBox: {
    paddingTop: 4,
  },

  // Teams
  teamList: { gap: 12 },
  teamItem: { gap: 6 },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  teamAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.25)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  teamAvatarText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.PRIMARY,
  },
  teamName: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 6,
  },
  delayedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 7,
    alignSelf: "flex-start",
  },
  delayedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EF4444",
  },

  // Phases
  phaseList: { gap: 14 },
  phaseItem: {},

  // Stagnant
  stagnantList: { gap: 8 },
  stagnantItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    backgroundColor: "rgba(248,113,113,0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.15)",
    borderLeftWidth: 3,
    borderLeftColor: "#F87171",
  },
  stagnantIcon: {
    marginTop: 1,
  },
  stagnantBody: { flex: 1 },
  stagnantTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },
  stagnantMeta: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    marginTop: 3,
  },
  stagnantMore: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    paddingTop: 4,
    fontStyle: "italic",
  },

  // Refresh
  refreshSection: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  refreshBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.PRIMARY,
  },
  refreshHint: {
    fontSize: 10,
    color: "rgba(255,255,255,0.25)",
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    lineHeight: 19,
  },
  loadingText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    marginTop: 4,
  },
  generateBtn: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.PRIMARY,
    marginTop: 4,
  },
  generateBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
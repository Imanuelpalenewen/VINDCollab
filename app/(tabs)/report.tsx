import { Colors } from "@/constants/Colors";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useQuery } from "convex/react";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Helpers
function fmt(ts: number) {
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function durationDays(start: number, end: number) {
  return Math.max(1, Math.round((end - start) / 86400000));
}

function scoreColor(score: number) {
  if (score >= 80) return Colors.SUCCESS;
  if (score >= 60) return Colors.WARNING;
  return Colors.ERROR;
}

function getGrade(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 60) return "D";
  return "F";
}

function getPerformanceLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  return "Needs Improvement";
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

// Rec label prefixes — cycles through predefined labels
const REC_LABELS = [
  "For Future Events",
  "Partner Selection",
  "Task Management",
  "Communication",
  "Timeline Planning",
  "Risk Management",
];

// Type
type EventItem = {
  _id: Id<"events">;
  title: string;
  eventType: string;
  status: string;
  startDate: number;
  endDate: number;
  hostOrgId: Id<"organizations">;
  isHost: boolean;
  hasReport: boolean;
};

// Event Picker
function EventPicker({
  events,
  selected,
  onSelect,
}: {
  events: EventItem[];
  selected: EventItem | null;
  onSelect: (e: EventItem) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.pickerWrap}>
      <TouchableOpacity
        style={styles.pickerBtn}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          {selected ? (
            <>
              <Text style={styles.pickerSelected} numberOfLines={1}>{selected.title}</Text>
              <Text style={styles.pickerSub}>{selected.eventType} · {selected.status}</Text>
            </>
          ) : (
            <Text style={styles.pickerPlaceholder}>Pilih event…</Text>
          )}
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={Colors.TEXT_MUTED} />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          {events.map((ev) => (
            <TouchableOpacity
              key={ev._id}
              style={[styles.dropdownItem, selected?._id === ev._id && styles.dropdownItemActive]}
              onPress={() => { onSelect(ev); setOpen(false); }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownTitle} numberOfLines={1}>{ev.title}</Text>
                <Text style={styles.dropdownSub}>{ev.eventType} · {ev.status}</Text>
              </View>
              {ev.hasReport && (
                <View style={styles.hasBadge}>
                  <Text style={styles.hasBadgeText}>Report</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// Horizontal Bar Chart
function BarChart({ partners }: { partners: { orgName: string; score: number }[] }) {
  const ticks = [0, 25, 50, 75, 100];
  return (
    <View style={styles.chartWrap}>
      {/* Y-axis labels + bars */}
      {partners.map((p, i) => (
        <View key={i} style={styles.chartRow}>
          <Text style={styles.chartLabel} numberOfLines={1}>
            {p.orgName.length > 10 ? p.orgName.slice(0, 9) + "." : p.orgName}
          </Text>
          <View style={styles.chartBarTrack}>
            <View
              style={[
                styles.chartBarFill,
                {
                  width: `${p.score}%` as any,
                  backgroundColor: scoreColor(p.score),
                },
              ]}
            />
          </View>
          <Text style={[styles.chartBarValue, { color: scoreColor(p.score) }]}>
            {p.score}
          </Text>
        </View>
      ))}
      {/* X-axis ticks */}
      <View style={styles.chartXAxis}>
        <View style={{ width: 68 }} />
        <View style={styles.chartTickRow}>
          {ticks.map((t) => (
            <Text key={t} style={styles.chartTick}>{t}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

// Main Screen
export default function ReportScreen() {
  const { selectedEventId: paramEventId } = useLocalSearchParams<{ selectedEventId: string }>();
  const events = useQuery(api.reports.getEventsForReport);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [generating, setGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
  if (paramEventId && events && !selectedEvent) {
    const match = events.find((e) => e._id === paramEventId);
    if (match) setSelectedEvent(match);
  }
}, [paramEventId, events]);

  const report = useQuery(
    api.ai.postEventReport.getReportByEvent,
    selectedEvent ? { eventId: selectedEvent._id } : "skip"
  );

  const generateReport = useAction(api.ai.postEventReport.generatePostEventReport);

  const handleGenerate = async () => {
    if (!selectedEvent) return;
    setGenerating(true);
    try {
      await generateReport({ eventId: selectedEvent._id });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Gagal generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!selectedEvent || !report) {
      Alert.alert("Error", "Report belum tersedia.");
      return;
    }
    try {
      const dur = durationDays(selectedEvent.startDate, selectedEvent.endDate);
      const text = `📊 Post-Event Report — ${selectedEvent.title}
📅 ${fmt(selectedEvent.startDate)} → ${fmt(selectedEvent.endDate)} (${dur} hari)

⭐ Overall Score: ${report.overallScore}/100
✅ Completion Rate: ${report.completionRate}%
📋 Total Tasks: ${report.totalTasks}
🤝 Total Partners: ${report.partnerScores.length}

📝 Lessons Learned:
${report.lessonsLearned.map((l, i) => `${i + 1}. ${l}`).join('\n')}

💡 Top Recommendation:
${report.recommendations[0] || '-'}

Generated by VINDCollab 🎓`;

      await Share.share({ message: text });
    } catch (e: any) {
      Alert.alert("Error", "Gagal membagikan report: " + e.message);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedEvent || !report) {
      Alert.alert("Error", "Report belum tersedia.");
      return;
    }
    setIsExporting(true);
    try {
      const dur = durationDays(selectedEvent.startDate, selectedEvent.endDate);

      const lessons = report.lessonsLearned ?? [];
      const mid = Math.ceil(lessons.length / 2);
      const workedWell = lessons.slice(0, mid);
      const improvements = lessons.slice(mid);

      const html = `
        <html>
          <head>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                background-color: #f8fafc; 
                color: #333333; 
                line-height: 1.6; 
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 800px;
                margin: 0 auto;
                background-color: #f8fafc;
              }
              .header {
                background: linear-gradient(135deg, #1a56db, #0e3a8a);
                padding: 40px;
                border-radius: 0;
                color: white;
                text-align: center;
              }
              .header-label {
                font-size: 12px;
                color: white;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-bottom: 8px;
              }
              .header-title {
                font-size: 32px;
                font-weight: bold;
                margin: 0 0 10px 0;
                color: white;
              }
              .header-subtitle {
                color: #93c5fd;
                font-size: 16px;
                margin: 0 0 20px 0;
              }
              .avatars {
                display: flex;
                justify-content: center;
                gap: -10px;
              }
              .avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-color: rgba(255,255,255,0.2);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
                margin-left: -10px;
                border: 2px solid #1a56db;
              }
              .avatar:first-child { margin-left: 0; }
              
              .section { 
                padding: 24px;
              }
              .card {
                background-color: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                padding: 24px;
              }
              .section-title { 
                color: #1a56db; 
                font-size: 18px; 
                margin-bottom: 15px; 
                margin-top: 0;
              }

              /* Executive Summary */
              .summary-card {
                border-left: 4px solid #1a56db;
              }
              .summary-box {
                background-color: #f0f7ff;
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 20px;
                font-size: 14px;
              }
              .score-badge {
                background-color: #dcfce7;
                padding: 16px;
                border-radius: 8px;
                text-align: center;
              }
              .score-value {
                font-size: 28px;
                font-weight: bold;
                color: #16a34a;
              }

              /* Metrics Grid */
              .metrics-grid { 
                display: flex; 
                flex-wrap: wrap; 
                gap: 20px; 
              }
              .metric-card { 
                background-color: white; 
                border: 1px solid #e5e7eb; 
                border-radius: 12px; 
                flex: 1; 
                min-width: 40%; 
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              }
              .metric-icon { font-size: 24px; margin-bottom: 10px; }
              .metric-value { font-size: 28px; font-weight: bold; color: #1a56db; margin-bottom: 4px; }
              .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }

              /* Lessons Learned */
              .lesson-box {
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              }
              .lesson-green { background-color: #f0fdf4; border-left: 4px solid #22c55e; }
              .lesson-yellow { background-color: #fffbeb; border-left: 4px solid #f59e0b; }
              .lesson-title { font-weight: bold; margin-bottom: 12px; }
              .lesson-title.green { color: #16a34a; }
              .lesson-title.yellow { color: #d97706; }
              .lesson-list { list-style: none; padding-left: 0; margin: 0; }
              .lesson-list li { margin-bottom: 8px; font-size: 14px; display: flex; }
              .lesson-list li::before { content: "•"; margin-right: 8px; font-weight: bold; }
              .lesson-list.green li::before { color: #22c55e; }
              .lesson-list.yellow li::before { color: #f59e0b; }

              /* Partner Table */
              table { 
                width: 100%; 
                border-collapse: collapse; 
                background-color: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              }
              th, td { padding: 16px; text-align: left; }
              th { background-color: #1a56db; color: white; font-weight: 600; }
              tr:nth-child(even) { background-color: #f8fafc; }
              tr { border-bottom: 1px solid #e5e7eb; }
              .score-high { color: #16a34a; font-weight: bold; }
              .score-med { color: #f59e0b; font-weight: bold; }
              .score-low { color: #dc2626; font-weight: bold; }

              /* Recommendations */
              .rec-container {
                background-color: #f0f7ff;
                border-radius: 12px;
                padding: 24px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              }
              .rec-item {
                display: flex;
                align-items: flex-start;
                padding: 16px;
                background: white;
                border-radius: 8px;
                margin-bottom: 12px;
                border: 1px solid #e5e7eb;
              }
              .rec-number {
                background-color: #1a56db;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                margin-right: 12px;
                flex-shrink: 0;
              }
              .rec-text { font-size: 14px; color: #334155; margin-top: 2px; }

              .footer { 
                text-align: center; 
                color: #9ca3af; 
                font-size: 12px; 
                padding: 24px; 
                border-top: 1px solid #bfdbfe; 
                margin: 20px 24px; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="header-label">POST-EVENT REPORT</div>
                <h1 class="header-title">${selectedEvent.title}</h1>
                <p class="header-subtitle">${fmt(selectedEvent.startDate)} - ${fmt(selectedEvent.endDate)} (${dur} days)</p>
                <div class="avatars">
                  ${report.partnerScores.slice(0, 5).map(p => `<div class="avatar">${initials(p.orgName)}</div>`).join('')}
                  ${report.partnerScores.length > 5 ? `<div class="avatar">+${report.partnerScores.length - 5}</div>` : ''}
                </div>
              </div>

              <div class="section">
                <div class="card summary-card">
                  <h2 class="section-title">⭐ EXECUTIVE SUMMARY</h2>
                  <div class="summary-box">${report.executiveSummary}</div>
                  <div class="score-badge">
                    <div class="score-value">${report.overallScore}/100 Overall Score</div>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="metrics-grid">
                  <div class="metric-card">
                    <div class="metric-icon">📋</div>
                    <div class="metric-value">${report.totalTasks}</div>
                    <div class="metric-label">Total Tasks</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-icon">✅</div>
                    <div class="metric-value">${report.completionRate}%</div>
                    <div class="metric-label">Completion Rate</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-icon">🤝</div>
                    <div class="metric-value">${report.partnerScores.length}</div>
                    <div class="metric-label">Total Partners</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-icon">⏰</div>
                    <div class="metric-value">${dur}</div>
                    <div class="metric-label">Days Duration</div>
                  </div>
                </div>
              </div>

              <div class="section">
                <h2 class="section-title">Partner Performance</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Tasks</th>
                      <th>Score</th>
                      <th>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${report.partnerScores.map(p => `
                      <tr>
                        <td><strong>${p.orgName}</strong></td>
                        <td>${p.tasksCompleted}</td>
                        <td class="${p.score >= 80 ? 'score-high' : p.score >= 60 ? 'score-med' : 'score-low'}">${p.score}/100</td>
                        <td>${getPerformanceLabel(p.score)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <div class="section">
                <h2 class="section-title">Lessons Learned</h2>
                ${workedWell.length > 0 ? `
                  <div class="lesson-box lesson-green">
                    <div class="lesson-title green">What Worked Well</div>
                    <ul class="lesson-list green">
                      ${workedWell.map(l => `<li>${l}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
                ${improvements.length > 0 ? `
                  <div class="lesson-box lesson-yellow">
                    <div class="lesson-title yellow">Areas for Improvement</div>
                    <ul class="lesson-list yellow">
                      ${improvements.map(l => `<li>${l}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>

              <div class="section">
                <h2 class="section-title">Recommendations</h2>
                <div class="rec-container">
                  ${report.recommendations.map((r, i) => `
                    <div class="rec-item">
                      <div class="rec-number">${i + 1}</div>
                      <div class="rec-text">${r}</div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="footer">
                Generated by VINDCollab • ${new Date().toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e: any) {
      Alert.alert("Error", "Gagal export PDF: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (events === undefined) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </SafeAreaView>
    );
  }

  // Split lessons: first half → "What Worked Well", second half → "Areas for Improvement"
  const lessons = report?.lessonsLearned ?? [];
  const mid = Math.ceil(lessons.length / 2);
  const workedWell = lessons.slice(0, mid);
  const improvements = lessons.slice(mid);

  const grade = report ? getGrade(report.overallScore) : "";
  const dur = selectedEvent
    ? durationDays(selectedEvent.startDate, selectedEvent.endDate)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Event Report</Text>
          {selectedEvent && (
            <Text style={styles.pageSubtitle} numberOfLines={1}>
              {selectedEvent.title} — Complete Analysis
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleShare}
          >
            <Ionicons name="share-social-outline" size={20} color={Colors.TEXT_PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={Colors.PRIMARY} />
            ) : (
              <Ionicons name="download-outline" size={20} color={Colors.TEXT_PRIMARY} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Event Picker */}
        <EventPicker events={events ?? []} selected={selectedEvent} onSelect={setSelectedEvent} />

        {/* Empty state */}
        {!selectedEvent && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={52} color={Colors.TEXT_MUTED} />
            <Text style={styles.emptyTitle}>Pilih event untuk melihat report</Text>
            <Text style={styles.emptyText}>Pilih event dari dropdown di atas, lalu generate AI report.</Text>
          </View>
        )}

        {/* Event not yet completed — report cannot be generated */}
        {selectedEvent && report === null && !generating && selectedEvent.status.toUpperCase() !== "COMPLETED" && (
          <View style={styles.generateWrap}>
            <Ionicons name="time-outline" size={44} color={Colors.TEXT_MUTED} style={{ marginBottom: 12 }} />
            <Text style={styles.generateTitle}>Event Not Completed</Text>
            <Text style={styles.generateDesc}>
              AI reports can only be generated for{" "}
              <Text style={{ color: Colors.SUCCESS, fontWeight: "700" }}>completed</Text> events.
              {"\n"}Current status:{" "}
              <Text style={{ color: Colors.WARNING, fontWeight: "700" }}>{selectedEvent.status}</Text>
            </Text>
          </View>
        )}

        {/* No report yet — event is completed, show generate button */}
        {selectedEvent && report === null && !generating && selectedEvent.status.toUpperCase() === "COMPLETED" && (
          <View style={styles.generateWrap}>
            <Ionicons name="sparkles-outline" size={44} color={Colors.PRIMARY} style={{ marginBottom: 12 }} />
            <Text style={styles.generateTitle}>Belum ada report</Text>
            <Text style={styles.generateDesc}>
              AI akan menganalisis semua task, partner, dan negosiasi untuk event ini.
            </Text>
            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} activeOpacity={0.8}>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>Generate Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Generating spinner */}
        {generating && (
          <View style={styles.generatingWrap}>
            <ActivityIndicator size="large" color={Colors.PRIMARY} />
            <Text style={styles.generatingText}>AI sedang menganalisis event…</Text>
            <Text style={styles.generatingSubText}>Proses ini membutuhkan 10–30 detik</Text>
          </View>
        )}

        {/* ══════════════ REPORT CONTENT ══════════════ */}
        {selectedEvent && report && !generating && (
          <>
            {/* Executive Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Executive Summary</Text>

              <View style={styles.summaryTextBox}>
                <Text style={styles.summaryText}>{report.executiveSummary}</Text>
              </View>

              <View style={styles.statusRow}>
                {/* Event Status card */}
                <View style={[styles.statusCard, styles.statusCardGreen]}>
                  <Text style={styles.statusCardLabel}>Event Status</Text>
                  <Text style={styles.statusCardValue}>
                    Completed{" "}
                    <Text style={{ fontSize: 16 }}>✓</Text>
                  </Text>
                </View>

                {/* Overall Grade card */}
                <View style={[styles.statusCard, styles.statusCardBlue]}>
                  <Text style={styles.statusCardLabel}>Overall Grade</Text>
                  <Text style={styles.gradeValue}>
                    {grade}{" "}
                    <Text style={styles.gradePercent}>({report.overallScore}%)</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Event Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Event Metrics</Text>
              <View style={styles.metricsGrid}>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIconWrap, { backgroundColor: "rgba(59,130,246,0.18)" }]}>
                    <Ionicons name="checkmark-circle-outline" size={22} color={Colors.PRIMARY} />
                  </View>
                  <Text style={styles.metricLabel}>Total Tasks</Text>
                  <Text style={styles.metricValue}>{report.totalTasks}</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIconWrap, { backgroundColor: "rgba(16,185,129,0.18)" }]}>
                    <Ionicons name="trending-up-outline" size={22} color={Colors.SUCCESS} />
                  </View>
                  <Text style={styles.metricLabel}>Completion Rate</Text>
                  <Text style={styles.metricValue}>{report.completionRate}%</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIconWrap, { backgroundColor: "rgba(245,158,11,0.18)" }]}>
                    <Ionicons name="people-outline" size={22} color={Colors.WARNING} />
                  </View>
                  <Text style={styles.metricLabel}>Partners</Text>
                  <Text style={styles.metricValue}>{report.partnerScores.length}</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIconWrap, { backgroundColor: "rgba(139,92,246,0.18)" }]}>
                    <Ionicons name="calendar-outline" size={22} color={Colors.ACCENT} />
                  </View>
                  <Text style={styles.metricLabel}>Duration</Text>
                  <Text style={styles.metricValue}>{dur} days</Text>
                </View>

              </View>
            </View>

            {/* Partner Performance */}
            {report.partnerScores.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Partner Performance</Text>

                {/* Horizontal Bar Chart */}
                <BarChart partners={report.partnerScores} />

                {/* Partner List */}
                <View style={styles.partnerList}>
                  {report.partnerScores.map((p) => {
                    const label = getPerformanceLabel(p.score);
                    const lColor =
                      label === "Excellent" ? Colors.SUCCESS
                        : label === "Good" ? Colors.WARNING
                          : Colors.ERROR;
                    return (
                      <View key={p.orgId} style={styles.partnerRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.partnerName}>{p.orgName}</Text>
                          <Text style={styles.partnerTasks}>{p.tasksCompleted} tasks completed</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.partnerScore}>
                            <Text style={{ color: Colors.PRIMARY, fontWeight: "700" }}>
                              {p.score}/100
                            </Text>
                          </Text>
                          <Text style={[styles.partnerLabel, { color: lColor }]}>{label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Lessons Learned */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lessons Learned</Text>

              {/* What Worked Well — green box */}
              {workedWell.length > 0 && (
                <View style={styles.lessonBoxGreen}>
                  <Text style={styles.lessonBoxTitleGreen}>What Worked Well</Text>
                  {workedWell.map((item, i) => (
                    <View key={i} style={styles.lessonBulletRow}>
                      <Text style={styles.lessonBulletGreen}>•</Text>
                      <Text style={styles.lessonBulletTextGreen}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Areas for Improvement — yellow box */}
              {improvements.length > 0 && (
                <View style={styles.lessonBoxYellow}>
                  <Text style={styles.lessonBoxTitleYellow}>Areas for Improvement</Text>
                  {improvements.map((item, i) => (
                    <View key={i} style={styles.lessonBulletRow}>
                      <Text style={styles.lessonBulletYellow}>•</Text>
                      <Text style={styles.lessonBulletTextYellow}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* AI Recommendations */}
            {report.recommendations.length > 0 && (
              <View style={[styles.section, styles.recSection]}>
                <Text style={styles.sectionTitle}>AI-Generated Recommendations</Text>
                {report.recommendations.map((rec, i) => (
                  <Text key={i} style={styles.recParagraph}>
                    <Text style={styles.recLabel}>{REC_LABELS[i] ?? `Tip ${i + 1}`}:{" "}</Text>
                    {rec}
                  </Text>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG_DARK },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.BG_DARK },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },

  // Page header
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  pageTitle: { fontSize: 24, fontWeight: "800", color: Colors.TEXT_PRIMARY },
  pageSubtitle: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    justifyContent: "center", alignItems: "center",
  },

  // Picker
  pickerWrap: { position: "relative", zIndex: 99 },
  pickerBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    borderRadius: 12, padding: 14,
  },
  pickerSelected: { fontSize: 15, fontWeight: "600", color: Colors.TEXT_PRIMARY },
  pickerSub: { fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 2 },
  pickerPlaceholder: { fontSize: 14, color: Colors.TEXT_MUTED },
  dropdownList: {
    position: "absolute", top: "100%", left: 0, right: 0,
    backgroundColor: "#0F172A", borderWidth: 1, borderColor: Colors.BORDER,
    borderRadius: 12, marginTop: 4, overflow: "hidden", zIndex: 100,
  },
  dropdownItem: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.BORDER },
  dropdownItemActive: { backgroundColor: "rgba(59,130,246,0.1)" },
  dropdownTitle: { fontSize: 14, fontWeight: "600", color: Colors.TEXT_PRIMARY },
  dropdownSub: { fontSize: 11, color: Colors.TEXT_MUTED, marginTop: 2 },
  hasBadge: { backgroundColor: "rgba(16,185,129,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  hasBadgeText: { fontSize: 10, color: Colors.SUCCESS, fontWeight: "600" },

  // Empty / Generate
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: Colors.TEXT_PRIMARY },
  emptyText: { fontSize: 13, color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 20 },
  generateWrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 32, gap: 8 },
  generateTitle: { fontSize: 17, fontWeight: "700", color: Colors.TEXT_PRIMARY, marginBottom: 4 },
  generateDesc: { fontSize: 13, color: Colors.TEXT_MUTED, textAlign: "center", lineHeight: 20 },
  generateBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 20, backgroundColor: Colors.PRIMARY,
    paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14,
  },
  generateBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  generatingWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  generatingText: { fontSize: 15, fontWeight: "600", color: Colors.TEXT_PRIMARY },
  generatingSubText: { fontSize: 12, color: Colors.TEXT_MUTED },

  // Section wrapper
  section: {
    backgroundColor: Colors.BG_CARD, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.BORDER, padding: 18, gap: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: Colors.TEXT_PRIMARY },

  // Executive Summary
  summaryTextBox: {
    backgroundColor: "rgba(59,130,246,0.07)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(59,130,246,0.15)", padding: 14,
  },
  summaryText: { fontSize: 13, color: Colors.TEXT_SECONDARY, lineHeight: 21 },
  statusRow: { flexDirection: "row", gap: 10 },
  statusCard: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1 },
  statusCardGreen: {
    backgroundColor: "rgba(16,185,129,0.1)",
    borderColor: "rgba(16,185,129,0.3)",
  },
  statusCardBlue: {
    backgroundColor: "rgba(59,130,246,0.1)",
    borderColor: "rgba(59,130,246,0.3)",
  },
  statusCardLabel: { fontSize: 11, color: Colors.TEXT_MUTED, marginBottom: 6 },
  statusCardValue: { fontSize: 18, fontWeight: "700", color: Colors.SUCCESS },
  gradeValue: { fontSize: 20, fontWeight: "800", color: Colors.PRIMARY },
  gradePercent: { fontSize: 14, fontWeight: "600", color: Colors.PRIMARY },

  // Metrics grid
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: {
    flex: 1, minWidth: "44%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14, borderWidth: 1, borderColor: Colors.BORDER,
    padding: 14, gap: 6,
  },
  metricIconWrap: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  metricLabel: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 },
  metricValue: { fontSize: 24, fontWeight: "800", color: Colors.TEXT_PRIMARY },

  // Bar chart
  chartWrap: { gap: 8, marginBottom: 4 },
  chartRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chartLabel: { width: 68, fontSize: 11, color: Colors.TEXT_MUTED, textAlign: "right" },
  chartBarTrack: {
    flex: 1, height: 10, backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 5, overflow: "hidden",
  },
  chartBarFill: { height: "100%", borderRadius: 5 },
  chartBarValue: { width: 28, fontSize: 11, fontWeight: "600", textAlign: "right" },
  chartXAxis: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  chartTickRow: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  chartTick: { fontSize: 10, color: Colors.TEXT_MUTED },

  // Partner list
  partnerList: { gap: 2 },
  partnerRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
  },
  partnerName: { fontSize: 14, fontWeight: "700", color: Colors.TEXT_PRIMARY },
  partnerTasks: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 },
  partnerScore: { fontSize: 15 },
  partnerLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },

  // Lessons learned
  lessonBoxGreen: {
    backgroundColor: "rgba(16,185,129,0.08)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(16,185,129,0.25)",
    padding: 14, gap: 8,
  },
  lessonBoxTitleGreen: { fontSize: 13, fontWeight: "700", color: Colors.SUCCESS },
  lessonBoxYellow: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)",
    padding: 14, gap: 8,
  },
  lessonBoxTitleYellow: { fontSize: 13, fontWeight: "700", color: Colors.WARNING },
  lessonBulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  lessonBulletGreen: { fontSize: 14, color: Colors.SUCCESS, lineHeight: 20 },
  lessonBulletYellow: { fontSize: 14, color: Colors.WARNING, lineHeight: 20 },
  lessonBulletTextGreen: { flex: 1, fontSize: 13, color: "#86EFAC", lineHeight: 20 },
  lessonBulletTextYellow: { flex: 1, fontSize: 13, color: "#FCD34D", lineHeight: 20 },

  // Recommendations
  recSection: { backgroundColor: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.2)" },
  recParagraph: { fontSize: 13, color: Colors.TEXT_SECONDARY, lineHeight: 21 },
  recLabel: { fontSize: 13, fontWeight: "700", color: Colors.PRIMARY },
});

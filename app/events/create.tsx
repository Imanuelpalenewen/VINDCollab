import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/Colors";

// Constants
const TOTAL_STEPS = 4;

const EVENT_TYPES = [
  "Seminar / Workshop", "Music Concert", "Competition", "Charity / Social",
  "Exhibition", "Sports", "Conference", "Cultural Festival", "Tech Event", "Other",
];

const REQUIREMENTS = [
  "Event Venue", "Funding / Sponsorship", "Sound System",
  "Photography", "Videography", "Marketing & Promotion",
  "Catering", "MC / Host", "Registration Team",
  "Transportation", "Decoration", "Security",
];

const PARTNER_CRITERIA = [
  "Event Venue", "Sound System", "Photography", "Videography",
  "Marketing", "Sponsorship", "Catering", "Design", "MC / Host",
  "Social Media", "Transportation", "Decoration", "Security",
  "Registration", "Technical Support",
];

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Types
interface EventForm {
  title: string;
  description: string;
  eventType: string;
  startDate: Date;
  endDate: Date;
  requirements: string[];
  partnerCriteria: string[];
}

// Date Picker
function DateSpinner({
  label,
  value,
  onChange,
  minDate,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  minDate?: Date;
}) {
  const changeDay = (delta: number) => {
    const d = new Date(value);
    const max = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(Math.max(1, d.getDate() + delta), max));
    if (!minDate || d >= minDate) onChange(d);
  };
  const changeMonth = (delta: number) => {
    const d = new Date(value);
    d.setMonth((d.getMonth() + 12 + delta) % 12);
    const max = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (d.getDate() > max) d.setDate(max);
    if (!minDate || d >= minDate) onChange(d);
  };
  const changeYear = (delta: number) => {
    const d = new Date(value);
    const ny = d.getFullYear() + delta;
    if (ny >= new Date().getFullYear()) {
      d.setFullYear(ny);
      if (!minDate || d >= minDate) onChange(d);
    }
  };

  const col = (label: string, onUp: () => void, onDn: () => void) => (
    <View style={ds.col}>
      <TouchableOpacity onPress={onUp} style={ds.arrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-up" size={18} color={Colors.PRIMARY} />
      </TouchableOpacity>
      <Text style={ds.colValue}>{label}</Text>
      <TouchableOpacity onPress={onDn} style={ds.arrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-down" size={18} color={Colors.PRIMARY} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={ds.wrapper}>
      <Text style={ds.label}>{label}</Text>
      <View style={ds.row}>
        {col(String(value.getDate()).padStart(2, "0"), () => changeDay(1), () => changeDay(-1))}
        <Text style={ds.sep}>·</Text>
        {col(MONTHS_SHORT[value.getMonth()], () => changeMonth(1), () => changeMonth(-1))}
        <Text style={ds.sep}>·</Text>
        {col(String(value.getFullYear()), () => changeYear(1), () => changeYear(-1))}
      </View>
      <Text style={ds.formatted}>
        {value.getDate()} {MONTHS[value.getMonth()]} {value.getFullYear()}
      </Text>
    </View>
  );
}

const ds = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.BG_INPUT, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.BORDER, padding: 16, marginBottom: 14,
  },
  label: { fontSize: 11, fontWeight: "700", color: Colors.TEXT_MUTED, letterSpacing: 0.5, marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  col: { alignItems: "center", minWidth: 60 },
  arrow: { padding: 4 },
  colValue: { fontSize: 22, fontWeight: "800", color: Colors.TEXT_PRIMARY, marginVertical: 4 },
  sep: { fontSize: 20, color: Colors.BORDER, fontWeight: "300" },
  formatted: { fontSize: 12, color: Colors.TEXT_MUTED, textAlign: "center", marginTop: 10 },
});

// Main Screen
export default function CreateEventScreen() {
  const router = useRouter();
  const createEventMutation = useMutation(api.events.createEvent);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<EventForm>({
    title: "",
    description: "",
    eventType: "",
    startDate: tomorrow,
    endDate: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
    requirements: [],
    partnerCriteria: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helpers
  const set = <K extends keyof EventForm>(key: K, val: EventForm[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const toggleItem = (key: "requirements" | "partnerCriteria", item: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(item) ? f[key].filter((x) => x !== item) : [...f[key], item],
    }));
  };

  // Validation per step
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!form.title.trim()) e.title = "Event title is required.";
      if (!form.description.trim()) e.description = "Description is required.";
      if (!form.eventType) e.eventType = "Please select an event type.";
    }
    if (step === 2) {
      if (form.endDate < form.startDate) e.date = "End date must be on or after start date.";
    }
    if (step === 3 && form.requirements.length === 0) {
      e.requirements = "Select at least one requirement.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    if (step === 1) { router.back(); return; }
    setStep((s) => s - 1);
    setErrors({});
  };

  // Submit
  const handleSubmit = async (publishImmediately: boolean) => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const eventId = await createEventMutation({
        title: form.title,
        description: form.description,
        eventType: form.eventType,
        startDate: form.startDate.getTime(),
        endDate: form.endDate.getTime(),
        requirements: form.requirements,
        partnerCriteria: form.partnerCriteria,
        status: publishImmediately ? "OPEN" : "DRAFT",
      });
      router.replace(`/events/${eventId}`);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to create event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step titles
  const STEP_INFO = [
    { title: "Basic Info",         subtitle: "What is your event about?" },
    { title: "Timeline",           subtitle: "When does your event take place?" },
    { title: "Requirements",       subtitle: "What do you need for this event?" },
    { title: "Partner Criteria",   subtitle: "What should partner organizations bring?" },
  ];

  // Render
  return (
    <SafeAreaView style={s.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={step === 1 ? "close" : "arrow-back"} size={20} color={Colors.TEXT_SECONDARY} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{STEP_INFO[step - 1].title}</Text>
            <Text style={s.headerSub}>{STEP_INFO[step - 1].subtitle}</Text>
          </View>
          <Text style={s.stepCounter}>{step}/{TOTAL_STEPS}</Text>
        </View>

        {/* Progress bar */}
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` as any }]} />
        </View>

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ══════ STEP 1 ════════════════════════════════════ */}
          {step === 1 && (
            <View style={s.card}>
              {/* Title */}
              <Text style={s.fieldLabel}>Event Title</Text>
              {errors.title && <Text style={s.fieldError}>{errors.title}</Text>}
              <View style={[s.inputWrap, errors.title && s.inputError]}>
                <Ionicons name="megaphone-outline" size={18} color={Colors.TEXT_MUTED} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="e.g. Music Festival Klabat 2025"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={form.title}
                  onChangeText={(v) => set("title", v)}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* Description */}
              <Text style={s.fieldLabel}>Description</Text>
              {errors.description && <Text style={s.fieldError}>{errors.description}</Text>}
              <TextInput
                style={[s.textArea, errors.description && s.inputError]}
                placeholder="Describe your event goals, expected audience, and scope..."
                placeholderTextColor={Colors.TEXT_MUTED}
                value={form.description}
                onChangeText={(v) => set("description", v)}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              {/* Event type */}
              <Text style={[s.fieldLabel, { marginTop: 4 }]}>Event Type</Text>
              {errors.eventType && <Text style={s.fieldError}>{errors.eventType}</Text>}
              <View style={s.chipGrid}>
                {EVENT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.chip, form.eventType === t && s.chipSelected]}
                    onPress={() => set("eventType", t)}
                  >
                    <Text style={[s.chipText, form.eventType === t && s.chipTextSelected]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ══════ STEP 2 ════════════════════════════════════ */}
          {step === 2 && (
            <View style={s.card}>
              {errors.date && (
                <View style={s.errorBanner}>
                  <Ionicons name="warning-outline" size={14} color={Colors.ERROR} />
                  <Text style={s.errorBannerText}>{errors.date}</Text>
                </View>
              )}
              <DateSpinner
                label="START DATE"
                value={form.startDate}
                onChange={(d) => {
                  set("startDate", d);
                  if (form.endDate < d) set("endDate", new Date(d.getTime() + 24 * 60 * 60 * 1000));
                }}
                minDate={today}
              />
              <DateSpinner
                label="END DATE"
                value={form.endDate}
                onChange={(d) => set("endDate", d)}
                minDate={form.startDate}
              />
              <View style={s.durationBadge}>
                <Ionicons name="time-outline" size={13} color={Colors.INFO} />
                <Text style={s.durationText}>
                  {Math.ceil((form.endDate.getTime() - form.startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1} day(s) long
                </Text>
              </View>
            </View>
          )}

          {/* ══════ STEP 3 ════════════════════════════════════ */}
          {step === 3 && (
            <View style={s.card}>
              <Text style={s.stepHint}>
                Check all resources you need from partner organizations.
              </Text>
              {errors.requirements && <Text style={s.fieldError}>{errors.requirements}</Text>}
              {REQUIREMENTS.map((req) => (
                <TouchableOpacity
                  key={req}
                  style={[s.checkRow, form.requirements.includes(req) && s.checkRowSelected]}
                  onPress={() => toggleItem("requirements", req)}
                  activeOpacity={0.7}
                >
                  <View style={[s.checkbox, form.requirements.includes(req) && s.checkboxChecked]}>
                    {form.requirements.includes(req) && (
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    )}
                  </View>
                  <Text style={[s.checkLabel, form.requirements.includes(req) && s.checkLabelSelected]}>
                    {req}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ══════ STEP 4 ════════════════════════════════════ */}
          {step === 4 && (
            <View style={s.card}>
              <Text style={s.stepHint}>
                Select capabilities you want partner organizations to have. The AI will use these to recommend the best matches.
              </Text>
              <View style={s.chipGrid}>
                {PARTNER_CRITERIA.map((cap) => (
                  <TouchableOpacity
                    key={cap}
                    style={[s.chip, form.partnerCriteria.includes(cap) && s.chipSelected]}
                    onPress={() => toggleItem("partnerCriteria", cap)}
                  >
                    {form.partnerCriteria.includes(cap) && (
                      <Ionicons name="checkmark" size={11} color={Colors.PRIMARY} style={{ marginRight: 3 }} />
                    )}
                    <Text style={[s.chipText, form.partnerCriteria.includes(cap) && s.chipTextSelected]}>
                      {cap}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {form.partnerCriteria.length > 0 && (
                <Text style={s.selectedHint}>{form.partnerCriteria.length} capability(ies) selected</Text>
              )}
            </View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Bottom actions */}
        <View style={s.footer}>
          {step < TOTAL_STEPS ? (
            <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={s.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={s.finalBtns}>
              <TouchableOpacity
                style={s.draftBtn}
                onPress={() => handleSubmit(false)}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.TEXT_SECONDARY} />
                ) : (
                  <Text style={s.draftBtnText}>Save Draft</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.publishBtn}
                onPress={() => handleSubmit(true)}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={16} color="#fff" />
                    <Text style={s.publishBtnText}>Publish Event</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles
const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },
  header: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.TEXT_PRIMARY, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 2 },
  stepCounter: { fontSize: 13, color: Colors.TEXT_MUTED, fontWeight: "600" },

  // Progress
  progressTrack: { height: 3, backgroundColor: Colors.BG_CARD, marginHorizontal: 20, borderRadius: 2, marginBottom: 20 },
  progressFill: { height: "100%", backgroundColor: Colors.PRIMARY, borderRadius: 2 },

  body: { paddingHorizontal: 20 },
  card: {
    backgroundColor: Colors.BG_CARD, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.BORDER, padding: 20,
  },

  // Field
  fieldLabel: {
    fontSize: 11, fontWeight: "700", color: Colors.TEXT_MUTED,
    letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8,
  },
  fieldError: { color: Colors.ERROR, fontSize: 12, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.BG_INPUT, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.BORDER, paddingHorizontal: 14, height: 50, marginBottom: 16,
  },
  inputError: { borderColor: Colors.BORDER_ERROR },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: Colors.TEXT_PRIMARY, fontSize: 14, height: "100%" },
  textArea: {
    backgroundColor: Colors.BG_INPUT, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.BORDER, padding: 14,
    color: Colors.TEXT_PRIMARY, fontSize: 14, minHeight: 110, marginBottom: 18,
  },

  // Chips (event type + partner criteria)
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.BORDER, backgroundColor: Colors.BG_INPUT,
  },
  chipSelected: { borderColor: "rgba(59,130,246,0.6)", backgroundColor: "rgba(59,130,246,0.12)" },
  chipText: { fontSize: 12, color: Colors.TEXT_SECONDARY, fontWeight: "500" },
  chipTextSelected: { color: Colors.PRIMARY, fontWeight: "700" },

  // Step 2 – date
  durationBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center",
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: "rgba(6,182,212,0.08)", borderWidth: 1, borderColor: "rgba(6,182,212,0.2)",
  },
  durationText: { fontSize: 13, color: Colors.INFO, fontWeight: "600" },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
  },
  errorBannerText: { color: Colors.ERROR, fontSize: 12, fontWeight: "600" },

  // Step 3 – requirements check list
  stepHint: { fontSize: 13, color: Colors.TEXT_MUTED, marginBottom: 16, lineHeight: 20 },
  checkRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.BORDER,
  },
  checkRowSelected: {},
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: Colors.BORDER, alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY },
  checkLabel: { fontSize: 14, color: Colors.TEXT_SECONDARY, fontWeight: "500" },
  checkLabelSelected: { color: Colors.TEXT_PRIMARY, fontWeight: "700" },

  // Step 4 hint
  selectedHint: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 14, textAlign: "center" },

  // Footer
  footer: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.BORDER,
    backgroundColor: Colors.BG_DARK,
  },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.PRIMARY, borderRadius: 14, paddingVertical: 16,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  finalBtns: { flexDirection: "row", gap: 10 },
  draftBtn: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 16,
    borderRadius: 14, backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
  },
  draftBtnText: { color: Colors.TEXT_SECONDARY, fontSize: 15, fontWeight: "600" },
  publishBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: Colors.PRIMARY,
  },
  publishBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAction, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/Colors";
import { Id } from "@/convex/_generated/dataModel";
import PartnerRecommendCard, {
  Recommendation,
} from "@/components/partners/PartnerRecommendCard";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecommendationResult {
  recommendations: Recommendation[];
  fromCache: boolean;
  generatedAt: number;
  message?: string;
}

// ── Skeleton Loading Component ────────────────────────────────────────────────

function SkeletonCard({ delay }: { delay: number }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[sk.card, { opacity: pulseAnim }]}>
      <View style={sk.headerRow}>
        <View style={sk.circle} />
        <View style={sk.headerLines}>
          <View style={sk.line} />
          <View style={[sk.line, { width: "50%" }]} />
        </View>
        <View style={sk.scoreBox} />
      </View>
      <View style={sk.body}>
        <View style={[sk.line, { width: "35%", marginBottom: 10 }]} />
        <View style={sk.chipRow}>
          <View style={sk.chip} />
          <View style={[sk.chip, { width: 70 }]} />
          <View style={[sk.chip, { width: 50 }]} />
        </View>
      </View>
      <View style={[sk.line, { width: "30%", marginTop: 12, marginBottom: 8 }]} />
      <View style={sk.line} />
      <View style={[sk.line, { width: "80%" }]} />
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PartnersRecommendationScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const generateRecs = useAction(
    api.ai.partnerRecommender.generatePartnerRecommendations,
  );

  const event = useQuery(api.events.getById, {
    id: (eventId ?? "") as Id<"events">,
  });

  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sparkles animation
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    );
    spin.start();
    return () => spin.stop();
  }, []);
  const sparkleRotate = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      if (!eventId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await generateRecs({
          eventId: eventId as Id<"events">,
          forceRefresh,
        });
        setResult(res as RecommendationResult);
      } catch (err: any) {
        setError(err?.message ?? "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    },
    [eventId, generateRecs],
  );

  // Auto-fetch on mount
  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleInvite = (orgId: string) => {
    const orgName =
      result?.recommendations.find((r) => r.orgId === orgId)?.orgName ??
      "this organization";
    Alert.alert(
      "Send Invitation",
      `Invite ${orgName} to collaborate on this event?\n\n(Invitation System will be available in the next update.)`,
      [{ text: "OK" }],
    );
  };

  const timeSince = (ms: number) => {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.flex} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.TEXT_SECONDARY} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Partner Recommendations</Text>
          {event && (
            <Text style={s.headerSubtitle} numberOfLines={1}>
              {event.title}
            </Text>
          )}
        </View>

        {/* Refresh */}
        <TouchableOpacity
          style={s.refreshBtn}
          onPress={() => fetchRecommendations(true)}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={loading ? Colors.TEXT_MUTED : Colors.PRIMARY}
          />
        </TouchableOpacity>
      </View>

      {/* ── Cache / Fresh indicator ── */}
      {result && !loading && (
        <View style={s.cacheBar}>
          <View
            style={[
              s.cacheBadge,
              result.fromCache ? s.cacheBadgeCached : s.cacheBadgeFresh,
            ]}
          >
            <Ionicons
              name={result.fromCache ? "time-outline" : "flash-outline"}
              size={12}
              color={result.fromCache ? Colors.WARNING : Colors.SUCCESS}
            />
            <Text
              style={[
                s.cacheBadgeText,
                {
                  color: result.fromCache ? Colors.WARNING : Colors.SUCCESS,
                },
              ]}
            >
              {result.fromCache ? "Cached" : "Fresh"}
            </Text>
          </View>
          <Text style={s.cacheTime}>
            Generated {timeSince(result.generatedAt)}
          </Text>
          {result.recommendations.length > 0 && (
            <Text style={s.resultCount}>
              {result.recommendations.length} org
              {result.recommendations.length !== 1 ? "s" : ""} found
            </Text>
          )}
        </View>
      )}

      {/* ── Content ── */}
      {loading ? (
        <View style={s.loadingContainer}>
          {/* AI Processing indicator */}
          <View style={s.aiProcessing}>
            <Animated.View style={{ transform: [{ rotate: sparkleRotate }] }}>
              <Ionicons name="sparkles" size={28} color={Colors.ACCENT} />
            </Animated.View>
            <Text style={s.aiProcessingTitle}>AI is analyzing...</Text>
            <Text style={s.aiProcessingText}>
              Evaluating organizations against your event requirements and
              partner criteria.
            </Text>
          </View>
          {/* Skeleton cards */}
          <View style={s.skeletonList}>
            <SkeletonCard delay={0} />
            <SkeletonCard delay={200} />
            <SkeletonCard delay={400} />
          </View>
        </View>
      ) : error ? (
        /* ── Error state ── */
        <View style={s.stateContainer}>
          <View style={s.stateIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={36}
              color={Colors.ERROR}
            />
          </View>
          <Text style={s.stateTitle}>Something went wrong</Text>
          <Text style={s.stateText}>{error}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => fetchRecommendations(true)}
          >
            <Ionicons name="refresh-outline" size={16} color="#fff" />
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : result && result.recommendations.length === 0 ? (
        /* ── Empty state ── */
        <View style={s.stateContainer}>
          <View style={s.stateIcon}>
            <Ionicons
              name="people-outline"
              size={36}
              color={Colors.TEXT_MUTED}
            />
          </View>
          <Text style={s.stateTitle}>No organizations found</Text>
          <Text style={s.stateText}>
            {result.message ??
              "There are no other organizations available at this time. Try again later or update your event criteria."}
          </Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={s.retryBtnText}>Back to Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Results ── */
        <FlatList
          data={result?.recommendations ?? []}
          keyExtractor={(item) => item.orgId}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <PartnerRecommendCard
              recommendation={item}
              rank={index + 1}
              onInvite={handleInvite}
            />
          )}
          ListFooterComponent={
            <View style={s.footer}>
              <TouchableOpacity
                style={s.refreshFullBtn}
                onPress={() => fetchRecommendations(true)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={16}
                  color={Colors.ACCENT}
                />
                <Text style={s.refreshFullBtnText}>
                  Re-generate Recommendations
                </Text>
              </TouchableOpacity>
              <Text style={s.footerNote}>
                AI recommendations are cached for 24 hours. Tap above to
                generate fresh results.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.BG_DARK },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
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
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  // Cache bar
  cacheBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  cacheBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  cacheBadgeCached: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderColor: "rgba(245,158,11,0.25)",
  },
  cacheBadgeFresh: {
    backgroundColor: "rgba(16,185,129,0.08)",
    borderColor: "rgba(16,185,129,0.25)",
  },
  cacheBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cacheTime: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
  },
  resultCount: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    marginLeft: "auto",
  },

  // Loading
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  aiProcessing: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  aiProcessingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    marginTop: 4,
  },
  aiProcessingText: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  skeletonList: {
    gap: 0,
    marginTop: 8,
  },

  // States (error / empty)
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  stateText: {
    fontSize: 13,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.PRIMARY,
    marginTop: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Results list
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  refreshFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(139,92,246,0.1)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
  },
  refreshFullBtnText: {
    color: Colors.ACCENT,
    fontSize: 13,
    fontWeight: "700",
  },
  footerNote: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});

// ── Skeleton Styles ───────────────────────────────────────────────────────────

const sk = StyleSheet.create({
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 16,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerLines: {
    flex: 1,
    marginLeft: 12,
    gap: 6,
  },
  line: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
  },
  scoreBox: {
    width: 54,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  body: {
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    width: 60,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
});

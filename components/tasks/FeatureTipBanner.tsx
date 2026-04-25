import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface FeatureTipBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

const tips = [
  {
    icon: "reorder-three-outline" as const,
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.12)",
    label: "Hold & drag up/down",
    desc: "Long press a card, then drag to reorder within the column",
  },
  {
    icon: "arrow-forward-circle-outline" as const,
    color: "#34D399",
    bg: "rgba(52,211,153,0.12)",
    label: "Hold & drag left/right",
    desc: "Long press a card, then drag sideways to change its status",
  },
  {
    icon: "finger-print-outline" as const,
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.12)",
    label: "Tap to open",
    desc: "View details, edit, or delete a task",
  },
];

export const FeatureTipBanner: React.FC<FeatureTipBannerProps> = ({
  visible,
  onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && !dismissed) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, dismissed]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDismissed(true);
      onDismiss();
    });
  };

  if (!visible || dismissed) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.sparkleWrap}>
            <Ionicons name="sparkles" size={14} color="#FBBF24" />
          </View>
          <Text style={styles.headerText}>How to use the Kanban board</Text>
        </View>
        <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
          <Ionicons name="close" size={16} color={Colors.TEXT_MUTED} />
        </TouchableOpacity>
      </View>

      {/* Tips row */}
      <View style={styles.tipsRow}>
        {tips.map((tip, i) => (
          <View key={i} style={styles.tipItem}>
            <View style={[styles.tipIconWrap, { backgroundColor: tip.bg }]}>
              <Ionicons name={tip.icon} size={18} color={tip.color} />
            </View>
            <Text style={[styles.tipLabel, { color: tip.color }]}>{tip.label}</Text>
            <Text style={styles.tipDesc}>{tip.desc}</Text>
          </View>
        ))}
      </View>

      {/* Bottom action */}
      <TouchableOpacity style={styles.gotItBtn} onPress={handleDismiss}>
        <Text style={styles.gotItText}>Got it, hide this</Text>
        <Ionicons name="checkmark" size={14} color={Colors.PRIMARY} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.25)",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    overflow: "hidden",
    // Subtle gradient border effect via shadow
    shadowColor: "#60A5FA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sparkleWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(251,191,36,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.BG_CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  tipsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 12,
  },
  tipItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  tipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tipLabel: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  tipDesc: {
    fontSize: 9,
    color: Colors.TEXT_MUTED,
    textAlign: "center",
    lineHeight: 13,
    fontWeight: "500",
  },
  gotItBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  gotItText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.PRIMARY,
  },
});
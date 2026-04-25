import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AnalyticsModalProps {
  visible: boolean;
  title: string;
  description: string;
  data: Array<{
    label: string;
    value: number | string;
    unit?: string;
    tooltip?: string;
    highlight?: boolean;
  }>;
  onClose: () => void;
  icon?: string;
  accentColor?: string;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  visible,
  title,
  description,
  data,
  onClose,
  icon,
  accentColor = Colors.PRIMARY,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: `${accentColor}18` }]}>
              {icon && (
                <Ionicons name={icon as any} size={24} color={accentColor} />
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <View style={styles.closeCircle}>
                <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.dataHeader}>DATA BREAKDOWN</Text>
            <View style={styles.dataGrid}>
              {data.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.dataCard,
                    item.highlight && {
                      borderColor: accentColor,
                      backgroundColor: `${accentColor}0A`,
                    },
                  ]}
                >
                  {/* Label row */}
                  <View style={styles.dataLabelRow}>
                    <Text style={styles.dataLabel}>{item.label}</Text>
                    {item.tooltip && (
                      <Ionicons
                        name="information-circle-outline"
                        size={14}
                        color="rgba(255,255,255,0.3)"
                      />
                    )}
                  </View>

                  {/* Value */}
                  <View style={[styles.valueBox, item.highlight && { backgroundColor: `${accentColor}15` }]}>
                    <Text
                      style={[
                        styles.dataValue,
                        item.highlight && { color: accentColor },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {item.value}
                      {item.unit && (
                        <Text style={styles.dataUnit}> {item.unit}</Text>
                      )}
                    </Text>
                  </View>

                  {/* Tooltip */}
                  {item.tooltip && (
                    <Text style={styles.tooltip}>{item.tooltip}</Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: accentColor }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.closeButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    backgroundColor: "#1C1F2E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingBottom: 0,
    // Ensure no bleed-through from backdrop
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "rgba(255,255,255,0.95)",
  },
  description: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 17,
  },
  closeBtn: {
    padding: 4,
    marginRight: -4,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginHorizontal: 0,
  },
  scrollView: {
    maxHeight: 420,
  },
  contentContainer: {
    padding: 20,
    gap: 12,
  },
  dataHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 1,
    marginBottom: 4,
  },
  dataGrid: {
    gap: 10,
  },
  dataCard: {
    backgroundColor: "#252838",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  dataLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dataLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  valueBox: {
    backgroundColor: "#2E3248",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dataValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "rgba(255,255,255,0.95)",
  },
  dataUnit: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
  },
  tooltip: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    lineHeight: 16,
    fontStyle: "italic",
  },
  footer: {
    padding: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    backgroundColor: "#1C1F2E",
  },
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});
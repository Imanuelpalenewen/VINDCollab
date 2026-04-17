import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

/** Stub screen — implemented by Member B (Session 9) */
export default function ReportScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Post-Event Report</Text>
      <Text style={styles.subtitle}>AI reports — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: Colors.TEXT_PRIMARY },
  subtitle: { fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 6 },
});

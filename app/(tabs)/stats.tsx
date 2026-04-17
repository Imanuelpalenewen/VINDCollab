import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

/** Stats / Analytics stub */
export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>Event statistics — coming soon</Text>
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

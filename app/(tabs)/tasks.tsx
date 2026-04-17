import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

/** Stub screen — implemented by Member A (Session 5, 6, 7) */
export default function TasksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks</Text>
      <Text style={styles.subtitle}>Kanban board — coming soon</Text>
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

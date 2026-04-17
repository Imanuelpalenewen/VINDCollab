import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

/** Stub screen — implemented by Member B (Session 10) */
export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat</Text>
      <Text style={styles.subtitle}>Room chat — coming soon</Text>
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

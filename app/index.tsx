import { View, ActivityIndicator, StatusBar } from "react-native";
import { Colors } from "@/constants/Colors";

/**
 * Entry point — shows a loading spinner while AuthGuard (in _layout.tsx) resolves
 * the auth state and redirects to the appropriate screen group.
 */
export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.BG_DARK,
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />
      <ActivityIndicator size="large" color={Colors.PRIMARY} />
    </View>
  );
}

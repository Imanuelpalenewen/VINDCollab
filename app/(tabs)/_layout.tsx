import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabIconProps {
  name: IoniconName;
  focused: boolean;
  size: number;
}

function TabIcon({ name, focused, size }: TabIconProps) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={focused ? Colors.TAB_ACTIVE : Colors.TAB_INACTIVE}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.TAB_BG,
          borderTopColor: Colors.TAB_BORDER,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.TAB_ACTIVE,
        tabBarInactiveTintColor: Colors.TAB_INACTIVE,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name={focused ? "home" : "home-outline"} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon
              name={focused ? "checkmark-circle" : "checkmark-circle-outline"}
              focused={focused}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              focused={focused}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon
              name={focused ? "bar-chart" : "bar-chart-outline"}
              focused={focused}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon
              name={focused ? "document-text" : "document-text-outline"}
              focused={focused}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}

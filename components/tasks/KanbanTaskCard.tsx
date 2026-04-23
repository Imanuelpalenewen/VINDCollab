import { Badge } from "@/components/ui/Badge";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useDragContext } from "./DragContext";

interface Task {
  _id: string;
  title: string;
  priority?: "HIGH" | "MED" | "LOW";
  assignedOrgName?: string;
  assignedOrgId?: string;
  dueDate?: number;
  estimatedHours?: number;
  isCritical?: boolean;
  status: "TODO" | "IN_PROGRESS" | "DONE";
}

interface KanbanTaskCardProps {
  task: Task;
  taskIndex: number;
  totalTasks: number;
  onPress: () => void;
  onStatusChange: (newStatus: "TODO" | "IN_PROGRESS" | "DONE") => Promise<void>;
  onReorder?: (newIndex: number) => void;
  onLongPress?: () => void;
  columnStatus: "TODO" | "IN_PROGRESS" | "DONE";
  canInteract: boolean;
  canDrag?: boolean;
}

const statusOrder: Record<string, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  DONE: 2,
};

const LONG_PRESS_DURATION = 500;
const SWIPE_THRESHOLD = 50;
const SWIPE_Y_MAX = 50;
const CARD_HEIGHT = 120;
const EDGE_ZONE = 80;
const AUTO_SCROLL_SPEED = 8;

export const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({
  task,
  taskIndex,
  totalTasks,
  onPress,
  onStatusChange,
  onReorder,
  onLongPress,
  columnStatus,
  canInteract,
  canDrag,
}) => {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);

  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLongPressActive, setIsLongPressActive] = useState(false);

  const dragContextRef = useRef<ReturnType<typeof useDragContext> | null>(null);
  const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollOffsetRef = useRef(0);

  const dragContext = useDragContext();
  dragContextRef.current = dragContext;

  // Use canDrag if provided, otherwise fall back to canInteract
  const isDragEnabled = canDrag !== undefined ? canDrag : canInteract;

  useEffect(() => {
    return () => {
      if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current);
    };
  }, []);

  const stopAutoScroll = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    dragContextRef.current?.setAutoScrollState({ scrolling: false, direction: null });
  };

  const checkAndTriggerAutoScroll = (translationY: number) => {
    if (!dragContextRef.current) return;
    const { columnRefs, setAutoScrollState } = dragContextRef.current;
    const columnRef = columnRefs.get(columnStatus);
    if (!columnRef?.current) return;

    (columnRef.current as any)?.measure?.(
      (_x: number, _y: number, _w: number, height: number) => {
        const relY = translationY + height / 2;
        if (relY < EDGE_ZONE) {
          setAutoScrollState({ scrolling: true, direction: "up" });
          if (!autoScrollIntervalRef.current) {
            autoScrollIntervalRef.current = setInterval(() => {
              scrollOffsetRef.current = Math.max(0, scrollOffsetRef.current - AUTO_SCROLL_SPEED);
              columnRef.current?.scrollToOffset({ offset: scrollOffsetRef.current, animated: false });
            }, 16);
          }
        } else if (relY > height - EDGE_ZONE) {
          setAutoScrollState({ scrolling: true, direction: "down" });
          if (!autoScrollIntervalRef.current) {
            autoScrollIntervalRef.current = setInterval(() => {
              scrollOffsetRef.current += AUTO_SCROLL_SPEED;
              columnRef.current?.scrollToOffset({ offset: scrollOffsetRef.current, animated: false });
            }, 16);
          }
        } else {
          stopAutoScroll();
        }
      }
    );
  };

  const handleDragStart = () => {
    setIsDragging(true);
    setIsLongPressActive(true);
    dragContext.setIsDraggingTask(true);
    dragContext.setDraggedTaskId(task._id);
    dragContext.setDragTranslationY(0);
  };

  const handleDragUpdate = (translationY: number) => {
    dragContext.setDragTranslationY(translationY);
    checkAndTriggerAutoScroll(translationY);
  };

  const handleDragEnd = async (translationX: number, translationY: number) => {
    if (!isDragEnabled) return;
    const isHorizontalSwipe =
      Math.abs(translationX) > SWIPE_THRESHOLD && Math.abs(translationY) < SWIPE_Y_MAX;

    if (isHorizontalSwipe) {
      const currentStatusIndex = statusOrder[task.status];
      const statuses: ("TODO" | "IN_PROGRESS" | "DONE")[] = ["TODO", "IN_PROGRESS", "DONE"];
      let newStatus: "TODO" | "IN_PROGRESS" | "DONE" | null = null;

      // Swipe RIGHT (positive) = maju status (TO → IN_PROGRESS → DONE)
      // Swipe LEFT (negative) = mundur status (DONE → IN_PROGRESS → TO)
      if (translationX > SWIPE_THRESHOLD && currentStatusIndex < 2) {
        newStatus = statuses[currentStatusIndex + 1];
      } else if (translationX < -SWIPE_THRESHOLD && currentStatusIndex > 0) {
        newStatus = statuses[currentStatusIndex - 1];
      }

      if (newStatus) {
        try {
          setLoading(true);
          await onStatusChange(newStatus);
        } catch (_) {
          Alert.alert("Error", "Failed to move task");
        } finally {
          setLoading(false);
        }
      }
    } else if (Math.abs(translationY) > 20 && onReorder && canInteract) {
      // Only allow reordering for users with canInteract permission
      const delta = Math.round(translationY / CARD_HEIGHT);
      if (delta !== 0) {
        const newIndex = Math.max(0, Math.min(totalTasks - 1, taskIndex + delta));
        if (newIndex !== taskIndex) onReorder(newIndex);
      }
    }
  };

  const handleDragCleanup = () => {
    stopAutoScroll();
    setIsDragging(false);
    setIsLongPressActive(false);
    dragContext.setIsDraggingTask(false);
    dragContext.setDraggedTaskId(null);
    dragContext.setDragTranslationY(0);
  };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_DURATION)
    .enabled(isDragEnabled)
    .onStart(() => {
      scale.value = withSpring(1.05, { damping: 10, mass: 0.5 });
      runOnJS(handleDragStart)();
    })
    .onUpdate(({ translationX, translationY }) => {
      offsetX.value = translationX;
      offsetY.value = translationY;
      runOnJS(handleDragUpdate)(translationY);
    })
    .onEnd(({ translationX, translationY }) => {
      runOnJS(handleDragEnd)(translationX, translationY);
    })
    .onFinalize(() => {
      offsetX.value = withSpring(0, { damping: 12, mass: 0.5 });
      offsetY.value = withSpring(0, { damping: 12, mass: 0.5 });
      scale.value = withSpring(1, { damping: 12, mass: 0.5 });
      runOnJS(handleDragCleanup)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  const isOverdue = task.dueDate ? task.dueDate < Date.now() : false;

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("id-ID", { month: "short", day: "numeric" });

  const currentIdx = statusOrder[task.status];

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle, isDragging && styles.containerDragging]}>
        <TouchableOpacity
          style={[
            styles.card,
            isOverdue && styles.cardOverdue,
            isDragging && styles.cardDragging,
            isLongPressActive && !isDragging && styles.cardLongPressed,
          ]}
          onPress={onPress}
          activeOpacity={0.7}
          disabled={loading || isDragging}
        >
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={Colors.PRIMARY} />
            </View>
          )}

          <Text style={styles.title} numberOfLines={2}>{task.title}</Text>

          <View style={styles.metaRow}>
            {task.priority && (
              <Badge
                variant={task.priority === "HIGH" ? "red" : task.priority === "MED" ? "amber" : "green"}
                label={task.priority}
              />
            )}
            {task.isCritical && (
              <View style={styles.criticalBadge}>
                <Ionicons name="flash" size={11} color={Colors.WARNING} />
                <Text style={styles.criticalText}>Critical</Text>
              </View>
            )}
          </View>

          {task.assignedOrgName && (
            <View style={styles.orgRow}>
              <Ionicons name="business-outline" size={12} color={Colors.TEXT_MUTED} />
              <Text style={styles.orgName} numberOfLines={1}>{task.assignedOrgName}</Text>
            </View>
          )}

          <View style={styles.footer}>
            {task.dueDate && (
              <View style={styles.footerItem}>
                <Ionicons name="calendar-outline" size={11} color={isOverdue ? Colors.ERROR : Colors.TEXT_MUTED} />
                <Text style={[styles.footerText, isOverdue && styles.overdueText]}>
                  {formatDate(task.dueDate)}
                </Text>
              </View>
            )}
            {task.estimatedHours && (
              <View style={styles.footerItem}>
                <Ionicons name="time-outline" size={11} color={Colors.TEXT_MUTED} />
                <Text style={styles.footerText}>{task.estimatedHours}h</Text>
              </View>
            )}
          </View>

          {/* Swipe hint */}
          {isDragEnabled && (
            <View style={styles.hintRow}>
              {currentIdx < 2 && (
                <Ionicons name="chevron-forward" size={12} color={Colors.BORDER} />
              )}
              <Text style={styles.swipeHint}>
                {isDragging ? "Drop to reorder" : isLongPressActive ? "Drag now" : "Hold & drag"}
              </Text>
              {currentIdx > 0 && (
                <Ionicons name="chevron-back" size={12} color={Colors.BORDER} />
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    width: "100%",
  },
  containerDragging: {
    zIndex: 100,
    elevation: 10,
  },
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    padding: 12,
    gap: 8,
    position: "relative",
  },
  cardOverdue: {
    borderColor: Colors.ERROR,
    borderWidth: 1.5,
  },
  cardDragging: {
    borderColor: Colors.PRIMARY,
    borderWidth: 2,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardLongPressed: {
    borderColor: Colors.PRIMARY,
    borderWidth: 1.5,
    backgroundColor: "rgba(59, 130, 246, 0.05)",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  criticalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(245,158,11,0.15)",
  },
  criticalText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.WARNING,
  },
  orgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orgName: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    fontWeight: "500",
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  footerText: {
    fontSize: 11,
    color: Colors.TEXT_MUTED,
    fontWeight: "500",
  },
  overdueText: {
    color: Colors.ERROR,
    fontWeight: "700",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginTop: 2,
  },
  swipeHint: {
    fontSize: 9,
    color: Colors.BORDER,
    fontWeight: "600",
    textAlign: "center",
  },
});
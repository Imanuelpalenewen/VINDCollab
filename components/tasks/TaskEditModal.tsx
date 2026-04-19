import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { Input } from "@/components/ui/Input";

interface Task {
  _id: string;
  title: string;
  estimatedHours?: number;
  priority?: "HIGH" | "MED" | "LOW";
  dueDate?: number;
  assignedOrgId?: string;
}

interface Partner {
  _id: string;
  name: string;
}

interface TaskEditModalProps {
  isVisible: boolean;
  task: Task;
  partners: Partner[];
  onClose: () => void;
  onSave: (updates: {
    title?: string;
    estimatedHours?: number;
    priority?: "HIGH" | "MED" | "LOW";
    dueDate?: number;
    assignedOrgId?: string;
  }) => Promise<void>;
}

export default function TaskEditModal({
  isVisible,
  task,
  partners,
  onClose,
  onSave,
}: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const [hours, setHours] = useState(String(task.estimatedHours ?? 10));
  const [selectedPriority, setSelectedPriority] = useState<
    "HIGH" | "MED" | "LOW"
  >(task.priority ?? "MED");
  const [selectedOrgId, setSelectedOrgId] = useState(task.assignedOrgId ?? "");
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  );
  const [saving, setSaving] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setHours(String(task.estimatedHours ?? 10));
    setSelectedPriority(task.priority ?? "MED");
    setSelectedOrgId(task.assignedOrgId ?? "");
    setDueDate(
      task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
    );
  }, [task, isVisible]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }

    setSaving(true);
    try {
      const updates: any = {};
      if (title !== task.title) updates.title = title;
      if (Number(hours) !== task.estimatedHours)
        updates.estimatedHours = Number(hours);
      if (selectedPriority !== task.priority) updates.priority = selectedPriority;
      if (selectedOrgId !== task.assignedOrgId)
        updates.assignedOrgId = selectedOrgId;
      if (dueDate) {
        const newDueDate = new Date(dueDate).getTime();
        if (newDueDate !== task.dueDate) updates.dueDate = newDueDate;
      }

      await onSave(updates);
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  if (!isVisible) return null;

  const selectedOrgName =
    partners.find((p) => p._id === selectedOrgId)?.name ?? "Select Organization";

  return (
    <View style={s.overlay}>
      <TouchableOpacity
        style={s.backdrop}
        onPress={onClose}
        activeOpacity={1}
      />
      <View style={s.modal}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Edit Task</Text>
          <TouchableOpacity
            style={s.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={Colors.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={s.section}>
            <Text style={s.label}>Task Title</Text>
            <Input
              placeholder="Task title"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Assigned Org */}
          <View style={s.section}>
            <Text style={s.label}>Assigned To</Text>
            <TouchableOpacity
              style={s.dropdown}
              onPress={() => setShowOrgDropdown(!showOrgDropdown)}
            >
              <Text style={s.dropdownText}>{selectedOrgName}</Text>
              <Ionicons
                name={showOrgDropdown ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.TEXT_MUTED}
              />
            </TouchableOpacity>
            {showOrgDropdown && (
              <View style={s.dropdownMenu}>
                {partners.map((partner) => (
                  <TouchableOpacity
                    key={partner._id}
                    style={[
                      s.dropdownItem,
                      selectedOrgId === partner._id &&
                        s.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedOrgId(partner._id);
                      setShowOrgDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        s.dropdownItemText,
                        selectedOrgId === partner._id &&
                          s.dropdownItemTextSelected,
                      ]}
                    >
                      {partner.name}
                    </Text>
                    {selectedOrgId === partner._id && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={Colors.PRIMARY}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Hours */}
          <View style={s.section}>
            <Text style={s.label}>Estimated Hours</Text>
            <Input
              placeholder="10"
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Priority */}
          <View style={s.section}>
            <Text style={s.label}>Priority</Text>
            <View style={s.priorityGrid}>
              {(["HIGH", "MED", "LOW"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    s.priorityBtn,
                    selectedPriority === p && s.priorityBtnActive,
                  ]}
                  onPress={() => setSelectedPriority(p)}
                >
                  <Text
                    style={[
                      s.priorityBtnText,
                      selectedPriority === p && s.priorityBtnTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Due Date */}
          <View style={s.section}>
            <Text style={s.label}>Due Date (YYYY-MM-DD)</Text>
            <Input
              placeholder="2026-05-15"
              value={dueDate}
              onChangeText={setDueDate}
            />
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={onClose}
            disabled={saving}
          >
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modal: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.BG_DARK,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    zIndex: 1000,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 16,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.TEXT_PRIMARY,
    fontWeight: "500",
  },
  dropdownMenu: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  dropdownItemText: {
    fontSize: 13,
    color: Colors.TEXT_PRIMARY,
  },
  dropdownItemTextSelected: {
    fontWeight: "600",
    color: Colors.PRIMARY,
  },
  priorityGrid: {
    flexDirection: "row",
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: "center",
  },
  priorityBtnActive: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  priorityBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_MUTED,
  },
  priorityBtnTextActive: {
    color: "#fff",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT_PRIMARY,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});

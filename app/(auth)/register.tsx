import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/Colors";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!EMAIL_REGEX.test(email.trim())) e.email = "Enter a valid email address.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 8) e.password = "Password must be at least 8 characters.";
    if (!confirm) e.confirm = "Please confirm your password.";
    else if (confirm !== password) e.confirm = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    setGlobalError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        flow: "signUp",
      });
      // AuthGuard → sees authenticated + no orgId → redirects to onboarding
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.toLowerCase().includes("already")) {
        setGlobalError("An account with this email already exists. Please sign in.");
      } else {
        setGlobalError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.BG_DARK} />

      <View style={styles.orbTopLeft} />
      <View style={styles.orbBottomRight} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.TEXT_SECONDARY} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join EventCollab and start collaborating</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {globalError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={15} color={Colors.ERROR} />
              <Text style={styles.errorBannerText}>{globalError}</Text>
            </View>
          )}

          <Input
            label="Full Name"
            icon="person-outline"
            placeholder="Your full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            error={errors.name}
          />

          <Input
            label="Email Address"
            icon="mail-outline"
            placeholder="you@university.edu"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />

          <Input
            label="Password"
            icon="lock-closed-outline"
            placeholder="Min. 8 characters"
            value={password}
            onChangeText={setPassword}
            isPassword
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            icon="shield-checkmark-outline"
            placeholder="Re-enter your password"
            value={confirm}
            onChangeText={setConfirm}
            isPassword
            error={errors.confirm}
            containerStyle={{ marginBottom: 8 }}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerBtn}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/login")}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.BG_DARK,
  },
  orbTopLeft: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(139, 92, 246, 0.10)",
  },
  orbBottomRight: {
    position: "absolute",
    bottom: 40,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  errorBannerText: {
    color: Colors.ERROR,
    fontSize: 13,
    flex: 1,
  },
  registerBtn: {
    marginTop: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  footerText: {
    color: Colors.TEXT_SECONDARY,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.PRIMARY,
    fontSize: 14,
    fontWeight: "700",
  },
});

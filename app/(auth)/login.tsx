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

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    setLoading(true);
    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        flow: "signIn",
      });
      // AuthGuard in _layout.tsx will handle the redirect reactively
    } catch (e: any) {
      setError(
        e?.message?.includes("Invalid")
          ? "Invalid email or password."
          : "Sign in failed. Please try again."
      );
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

      {/* Background decorative orbs */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="people-circle" size={44} color={Colors.PRIMARY} />
          </View>
          <Text style={styles.appName}>VINDCollab</Text>
          <Text style={styles.tagline}>Campus Event Collaboration Platform</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back 👋</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={15} color={Colors.ERROR} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <Input
            label="Email Address"
            icon="mail-outline"
            placeholder="you@university.edu"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <Text style={styles.footerLink}>Register</Text>
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
  // Decorative background blobs
  orbTopRight: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(59, 130, 246, 0.10)",
  },
  orbBottomLeft: {
    position: "absolute",
    bottom: 60,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  // Logo
  logoSection: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.28)",
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    letterSpacing: 0.2,
  },
  // Card
  card: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 24,
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
  loginBtn: {
    marginTop: 8,
  },
  // Footer
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

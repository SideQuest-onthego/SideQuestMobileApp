import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/FirebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>(""); // NEW
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  async function handleSignUp() {
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      router.replace("/(first-time)/distance");
    } catch (e: unknown) {
      const err = e as { code?: string };
      const code = err.code ?? "";
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Try logging in.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else {
        setError("Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>

        <View style={styles.centered}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.brand}>SideQuest</Text>
            <Text style={styles.tagline}>on the go</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>

            {/* Name */}
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor="#aaa"
              autoCorrect={false}
              value={name}
              onChangeText={setName}
            />

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a password"
                placeholderTextColor="#aaa"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#2D6A4F"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter your password"
                placeholderTextColor="#aaa"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Error message */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Sign Up Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            {/* Login redirect */}
            <TouchableOpacity onPress={() => router.push("/(auth)/login" as any)}>
              <Text style={styles.loginText}>
                Already have an account?{" "}
                <Text style={styles.loginLink}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#102C26",
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
  },
  centered: {
    justifyContent: "flex-start",
    marginTop: 16,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "#000",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 60,
    marginBottom: 16,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  brand: {
    fontSize: 42,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 18,
    color: "#95D5B2",
    letterSpacing: 4,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#000",
    padding: 28,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2D6A4F",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2D6A4F",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#F4F4F4",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#333",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F4F4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: "#333",
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  button: {
    backgroundColor: "#102C26",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#000",
    padding: 16,
    alignItems: "center",
    marginTop: 28,
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  loginText: {
    textAlign: "center",
    color: "#888",
    fontSize: 13,
  },
  loginLink: {
    color: "#2D6A4F",
    fontWeight: "700",
  },
  errorText: {
    color: "#D9534F",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
});
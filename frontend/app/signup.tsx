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

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError("");
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      router.replace("/(tabs)");
    } catch (e: any) {
      const code = e?.code ?? "";
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
            value={email}
            onChangeText={setEmail}
          />

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

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
          <TouchableOpacity onPress={() => router.push("/login" as any)}>
            <Text style={styles.loginText}>
              Already have an account?{" "}
              <Text style={styles.loginLink}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
//below is preety much all styling
const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: "#102C26",
},
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
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
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
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

});
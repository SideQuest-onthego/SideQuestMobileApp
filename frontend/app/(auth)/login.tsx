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
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/FirebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
   const router = useRouter();

   const [email, setEmail] = useState<string>("");
   const [password, setPassword] = useState<string>("");
   const [error, setError] = useState<string>("");
   const [loading, setLoading] = useState<boolean>(false);
   const [showPassword, setShowPassword] = useState<boolean>(false);

   async function handleLogin() {
      setError("");

      if (!email || !password) {
         setError("Please enter your email and password.");
         return;
      }

      setLoading(true);

      try {
         await signInWithEmailAndPassword(auth, email, password);
         router.replace("/(tabs)/home");
      } catch (e: unknown) {
         const err = e as { code?: string };
         const code = err.code ?? "";

         if (
            code === "auth/user-not-found" ||
            code === "auth/invalid-credential" ||
            code === "auth/wrong-password"
         ) {
            setError(
               "No account found with these credentials. Please check your email and password or sign up.",
            );
         } else if (code === "auth/invalid-email") {
            setError("Please enter a valid email address.");
         } else {
            setError("Login failed. Please try again.");
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
         {/* Back Button — outside scroll, pinned to top-left */}
         <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
         >
            <Text style={styles.backButtonText}>{"<"} Back</Text>
         </TouchableOpacity>

         <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
         >
            <View style={styles.centered}>
               {/* Header / Logo */}
               <View style={styles.header}>
                  <Text style={styles.brand}>SideQuest</Text>
                  <Text style={styles.tagline}>on the go</Text>
               </View>

               {/* Card */}
               <View style={styles.card}>
                  <Text style={styles.title}>Welcome Back</Text>

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
                        placeholder="Your password"
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
                           name={
                              showPassword ? "eye-off-outline" : "eye-outline"
                           }
                           size={22}
                           color="#2D6A4F"
                        />
                     </TouchableOpacity>
                  </View>

                  {/* Forgot Password */}
                  <TouchableOpacity style={styles.forgotPassword}>
                     <Text style={styles.forgotPasswordText}>
                        Forgot password?
                     </Text>
                  </TouchableOpacity>

                  {/* Error */}
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  {/* Login Button */}
                  <TouchableOpacity
                     style={styles.button}
                     onPress={handleLogin}
                     disabled={loading}
                  >
                     {loading ? (
                        <ActivityIndicator color="#fff" />
                     ) : (
                        <Text style={styles.buttonText}>Log In</Text>
                     )}
                  </TouchableOpacity>

                  {/* Sign Up */}
                  <TouchableOpacity
                     onPress={() => router.push("/(auth)/signup" as any)}
                  >
                     <Text style={styles.signupText}>
                        Do not have an account?{" "}
                        <Text style={styles.signupLink}>Sign up</Text>
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
   backButton: {
      alignSelf: "flex-start",
      backgroundColor: "#000",
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginTop: 68,
      marginLeft: 24,
   },
   backButtonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 1,
   },
   scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 90,
      paddingBottom: 40,
   },
   centered: {
      justifyContent: "flex-start",
      alignItems: "center",
   },
   header: {
      alignItems: "center",
      marginBottom: 28,
   },
   brand: {
      fontSize: 48,
      fontWeight: "900",
      color: "#fff",
      letterSpacing: 2,
      textAlign: "center",
   },
   tagline: {
      fontSize: 18,
      color: "#95D5B2",
      letterSpacing: 4,
      marginTop: 4,
      textAlign: "center",
   },
   card: {
      backgroundColor: "#fff",
      borderRadius: 24,
      padding: 28,
      width: "100%",
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
   forgotPassword: {
      alignSelf: "flex-end",
      marginTop: 8,
      marginBottom: 4,
   },
   forgotPasswordText: {
      color: "#2D6A4F",
      fontSize: 13,
      fontWeight: "600",
   },
   button: {
      backgroundColor: "#102C26",
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
      marginTop: 20,
      marginBottom: 16,
   },
   buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 1,
   },
   signupText: {
      textAlign: "center",
      color: "#888",
      fontSize: 13,
   },
   signupLink: {
      color: "#2D6A4F",
      fontWeight: "700",
   },
   errorText: {
      color: "#D00000",
      fontSize: 13,
      marginTop: 10,
      textAlign: "center",
   },
});

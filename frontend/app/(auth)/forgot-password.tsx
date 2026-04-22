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
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../FirebaseConfig";

export default function ForgotPasswordScreen() {
   const router = useRouter();

   const [email, setEmail] = useState("");
   const [error, setError] = useState("");
   const [loading, setLoading] = useState(false);

   async function handleSendCode() {
      setError("");

      if (!email) {
         setError("Please enter your email.");
         return;
      }

      setLoading(true);

      try {
         await sendPasswordResetEmail(auth, email);
         router.push({
            pathname: "/(auth)/verify-code",
            params: { email },
         } as any);
      } catch (err: any) {
         if (err.code === "auth/user-not-found") {
            setError("No account found with this email.");
         } else if (err.code === "auth/invalid-email") {
            setError("Please enter a valid email address.");
         } else {
            setError("Failed to send reset email. Please try again.");
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
         <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
         >
            <Text style={styles.backButtonText}>{"<"} Back</Text>
         </TouchableOpacity>

         <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.centered}>

               <View style={styles.header}>
                  <Text style={styles.brand}>SideQuest</Text>
                  <Text style={styles.tagline}>on the go</Text>
               </View>

               <View style={styles.card}>
                  <Text style={styles.title}>Forgot Password</Text>

                  <Text style={styles.label}>Email</Text>
                  <TextInput
                     style={styles.input}
                     placeholder="you@email.com"
                     placeholderTextColor="#aaa"
                     autoCapitalize="none"
                     keyboardType="email-address"
                     value={email}
                     onChangeText={setEmail}
                  />

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  <TouchableOpacity
                     style={styles.button}
                     onPress={handleSendCode}
                     disabled={loading}
                  >
                     {loading ? (
                        <ActivityIndicator color="#fff" />
                     ) : (
                        <Text style={styles.buttonText}>Send Verification Code</Text>
                     )}
                  </TouchableOpacity>
               </View>
            </View>
         </ScrollView>
      </KeyboardAvoidingView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: "#102C26" },
   backButton: {
      alignSelf: "flex-start",
      backgroundColor: "#000",
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginTop: 68,
      marginLeft: 24,
   },
   backButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
   scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 90 },
   centered: { alignItems: "center" },
   header: { alignItems: "center", marginBottom: 28 },
   brand: { fontSize: 48, fontWeight: "900", color: "#fff", letterSpacing: 2 },
   tagline: { fontSize: 18, color: "#95D5B2", letterSpacing: 4, marginTop: 4 },
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
   title: { fontSize: 26, fontWeight: "800", color: "#2D6A4F", marginBottom: 10 },
   label: { fontSize: 13, fontWeight: "600", color: "#2D6A4F", marginBottom: 6 },
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
      padding: 16,
      alignItems: "center",
      marginTop: 20,
   },
   buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
   errorText: { color: "#D00000", marginTop: 10, textAlign: "center" },
});
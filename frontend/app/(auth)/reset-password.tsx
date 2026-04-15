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
} from "react-native";
import { useRouter } from "expo-router";

export default function ResetPasswordScreen() {
   const router = useRouter();

   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [error, setError] = useState("");

   function handleReset() {

      if (!password || !confirmPassword) {
         setError("Please fill out all fields.");
         return;
      }

      if (password !== confirmPassword) {
         setError("Passwords do not match.");
         return;
      }

      router.replace("/(auth)/login");
   }

   return (
      <KeyboardAvoidingView
         style={styles.container}
         behavior={Platform.OS === "ios" ? "padding" : "height"}
      >

         <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.centered}>

               <View style={styles.header}>
                  <Text style={styles.brand}>SideQuest</Text>
                  <Text style={styles.tagline}>on the go</Text>
               </View>

               <View style={styles.card}>
                  <Text style={styles.title}>Reset Password</Text>

                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                     style={styles.input}
                     secureTextEntry
                     placeholder="New password"
                     placeholderTextColor="#aaa"
                     value={password}
                     onChangeText={setPassword}
                  />

                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                     style={styles.input}
                     secureTextEntry
                     placeholder="Confirm password"
                     placeholderTextColor="#aaa"
                     value={confirmPassword}
                     onChangeText={setConfirmPassword}
                  />

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  <TouchableOpacity style={styles.button} onPress={handleReset}>
                     <Text style={styles.buttonText}>Change Password</Text>
                  </TouchableOpacity>
               </View>

            </View>
         </ScrollView>
      </KeyboardAvoidingView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: "#102C26" },
   scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 120 },
   centered: { alignItems: "center" },
   header: { alignItems: "center", marginBottom: 28 },
   brand: { fontSize: 48, fontWeight: "900", color: "#fff" },
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
   label: { fontSize: 13, fontWeight: "600", color: "#2D6A4F", marginBottom: 6, marginTop: 12 },
   input: { backgroundColor: "#F4F4F4", borderRadius: 12, padding: 14 },
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
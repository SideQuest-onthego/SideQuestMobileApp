import { auth } from "@/FirebaseConfig";
import { useRouter } from "expo-router";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { useEffect, useState } from "react";
import {
   ActivityIndicator,
   Pressable,
   ScrollView,
   StyleSheet,
   Text,
   TextInput,
   TouchableOpacity,
   View,
} from "react-native";

export default function AccountProfileScreen() {
   const router = useRouter();
   const [nameInput, setNameInput] = useState("");
   const [email, setEmail] = useState("Not available");
   const [status, setStatus] = useState("");
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
         const displayName = user?.displayName?.trim() || "";
         setNameInput(displayName);
         setEmail(user?.email?.trim() || "Not available");
      });

      return unsubscribe;
   }, []);

   async function handleSaveName() {
      const trimmedName = nameInput.trim();

      if (!trimmedName) {
         setStatus("Please enter a valid name.");
         return;
      }

      const user = auth.currentUser;
      if (!user) {
         setStatus("No signed-in user found.");
         return;
      }

      setSaving(true);
      setStatus("");

      try {
         await updateProfile(user, { displayName: trimmedName });
         setNameInput(trimmedName);
         setStatus("Name updated.");
      } catch {
         setStatus("Could not update your name. Please try again.");
      } finally {
         setSaving(false);
      }
   }

   return (
      <ScrollView
         style={styles.container}
         contentContainerStyle={styles.scrollContent}
      >
         <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back</Text>
         </Pressable>

         <Text style={styles.title}>Account Details</Text>

         <View style={styles.infoCard}>
            <Text style={styles.label}>Name</Text>
            <TextInput
               style={styles.input}
               value={nameInput}
               onChangeText={setNameInput}
               placeholder="Enter your name"
               placeholderTextColor="#9CA3AF"
               autoCapitalize="words"
            />
            <TouchableOpacity
               style={styles.button}
               onPress={handleSaveName}
               disabled={saving}
            >
               {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
               ) : (
                  <Text style={styles.buttonText}>Save Name</Text>
               )}
            </TouchableOpacity>
            {status ? <Text style={styles.status}>{status}</Text> : null}
         </View>

         <View style={styles.infoCard}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{email}</Text>
         </View>
      </ScrollView>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: "#DBFEF7",
   },
   scrollContent: {
      flexGrow: 1,
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 44,
      paddingBottom: 120,
   },
   backButton: {
      alignSelf: "flex-start",
      marginTop: 16,
      marginBottom: 28,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: "#111",
      borderRadius: 999,
   },
   backButtonText: {
      color: "#fff",
      fontWeight: "700",
   },
   title: {
      fontSize: 24,
      fontWeight: "800",
      color: "#111827",
      marginBottom: 18,
      width: "100%",
      maxWidth: 320,
   },
   infoCard: {
      width: "100%",
      maxWidth: 320,
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "#000000",
      padding: 16,
      marginBottom: 14,
   },
   label: {
      fontSize: 16,
      fontWeight: "600",
      color: "#111827",
      marginBottom: 8,
   },
   value: {
      borderWidth: 1.5,
      borderColor: "#B7CFC8",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: "#102C26",
      fontWeight: "700",
      backgroundColor: "#F2FBF8",
   },
   input: {
      borderWidth: 1.5,
      borderColor: "#B7CFC8",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: "#111827",
      backgroundColor: "#F2FBF8",
   },
   button: {
      marginTop: 16,
      backgroundColor: "#102C26",
      borderRadius: 14,
      alignItems: "center",
      paddingVertical: 12,
   },
   buttonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
   },
   status: {
      marginTop: 10,
      fontSize: 13,
      color: "#5B746E",
      fontWeight: "500",
   },
});

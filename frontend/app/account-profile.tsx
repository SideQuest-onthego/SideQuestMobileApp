import { auth } from "@/FirebaseConfig";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { useEffect, useState } from "react";
import {
   ActivityIndicator,
   StyleSheet,
   Text,
   TextInput,
   TouchableOpacity,
   View,
} from "react-native";

export default function AccountProfileScreen() {
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
      <View style={styles.container}>
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
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: "#CFDAF1",
      paddingHorizontal: 24,
      paddingTop: 28,
   },
   title: {
      fontSize: 24,
      fontWeight: "700",
      color: "#111827",
      marginBottom: 18,
   },
   infoCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#D1D5DB",
      padding: 14,
      marginBottom: 12,
   },
   label: {
      fontSize: 13,
      fontWeight: "600",
      color: "#6B7280",
      marginBottom: 6,
   },
   value: {
      fontSize: 18,
      color: "#111827",
      fontWeight: "500",
   },
   input: {
      borderWidth: 1,
      borderColor: "#D1D5DB",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: "#111827",
      backgroundColor: "#F9FAFB",
   },
   button: {
      marginTop: 12,
      backgroundColor: "#111827",
      borderRadius: 10,
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
      color: "#374151",
   },
});

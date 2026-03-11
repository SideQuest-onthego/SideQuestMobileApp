import { auth } from "@/FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AccountProfileScreen() {
   const [name, setName] = useState("Not set");
   const [email, setEmail] = useState("Not available");

   useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
         setName(user?.displayName?.trim() || "Not set");
         setEmail(user?.email?.trim() || "Not available");
      });

      return unsubscribe;
   }, []);

   return (
      <View style={styles.container}>
         <Text style={styles.title}>Account Details</Text>

         <View style={styles.infoCard}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{name}</Text>
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
});

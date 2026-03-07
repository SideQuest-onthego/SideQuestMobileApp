import { IconSymbol } from "@/components/ui/icon-symbol";
import { auth } from "@/FirebaseConfig";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function AccountScreen() {
   const router = useRouter();
   const [displayName, setDisplayName] = useState("your_name");

   useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
         setDisplayName(user?.displayName?.trim() || "your_name");
      });

      return unsubscribe;
   }, []);

   return (
      <View style={styles.container}>
         <View style={styles.iconWrap}>
            <IconSymbol name="person.crop.circle.fill" size={92} color="#1F2937" />
            <Pressable
               style={styles.editButton}
               onPress={() => router.push("/account-profile")}
            >
               <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
         </View>
         <Text style={styles.welcomeText}>Welcome {displayName}</Text>
         <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>must be filled out here</Text>
         </View>
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      alignItems: "center",
      backgroundColor: "#CFDAF1",
      paddingHorizontal: 24,
      paddingTop: 72,
   },
   iconWrap: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
   },
   editButton: {
      position: "absolute",
      right: -10,
      bottom: -6,
      backgroundColor: "#1F2937",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
   },
   editButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
   },
   welcomeText: {
      marginTop: 8,
      fontSize: 18,
      fontWeight: "600",
      color: "#111827",
   },
   placeholderBox: {
      marginTop: 14,
      width: "100%",
      maxWidth: 320,
      minHeight: 90,
      borderWidth: 1,
      borderColor: "#9CA3AF",
      borderRadius: 10,
      backgroundColor: "#FFFFFF",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 12,
   },
   placeholderText: {
      fontSize: 16,
      color: "#374151",
      textAlign: "center",
   },
});

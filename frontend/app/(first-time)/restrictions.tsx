import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AuthBackground from "@/components/AuthBackground";

export default function RestrictionsScreen() {
  const router = useRouter();

  return (
    <AuthBackground variant="br">
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/explore")}
        >
          <Text style={styles.backButtonText}>Back to Explore</Text>
        </TouchableOpacity>
        <Text style={styles.title}>RESTRICTIONS SCREEN. ARMAN WAS HERE.</Text>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: 80,
    left: 24,
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
    fontWeight: "700",
    color: "#111",
  },
});

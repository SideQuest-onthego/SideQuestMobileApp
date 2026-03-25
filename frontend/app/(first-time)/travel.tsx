import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AuthBackground from "@/components/AuthBackground";

const TRAVEL_OPTIONS = [
  { id: "walking", label: "Walking", icon: "🚶" },
  { id: "driving", label: "Driving", icon: "🚗" },
  { id: "taxi", label: "Taxi", icon: "🚕" },
  { id: "train", label: "Train", icon: "🚆" },
  { id: "bus", label: "Bus", icon: "🚌" },
  { id: "bike", label: "Bike", icon: "🚲" },
  { id: "subway", label: "Subway", icon: "🚇" },
  { id: "scooter", label: "Scooter", icon: "🛴" },
  { id: "ferry", label: "Ferry", icon: "⛴️" },
];

export default function TravelScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  const toggleOption = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (error) setError("");
  };

  const handleContinue = () => {
    if (selected.length === 0) {
      setError("Please select at least one travel method");
      return;
    }
    setError("");
    router.push("/(first-time)/budget");
  };

  return (
    <AuthBackground variant="tl">
      <View style={styles.center}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/explore")}
        >
          <Text style={styles.backButtonText}>Back to Explore</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>How do you get around?</Text>
          <Text style={styles.subtitle}>
            Select all the ways you like to travel
          </Text>

          <View style={styles.optionsContainer}>
            {TRAVEL_OPTIONS.map((option) => {
              const active = selected.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionButton, active && styles.optionButtonActive]}
                  onPress={() => toggleOption(option.id)}
                >
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <Text
                    style={[styles.optionText, active && styles.optionTextActive]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          <Text style={styles.helper}>You can update this anytime</Text>
        </View>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#111",
    borderRadius: 999,
  },

  backButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "rgb(255,255,255)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 13,
    color: "rgba(0,0,0,0.55)",
  },

  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },

  optionButton: {
    width: "31%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "#fff",
    gap: 6,
  },

  optionButtonActive: {
    backgroundColor: "#5a8bff",
    borderColor: "#5a8bff",
  },

  optionIcon: {
    fontSize: 28,
  },

  optionText: {
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },

  optionTextActive: {
    color: "#fff",
  },

  error: {
    marginTop: 10,
    color: "#fb3d60",
    fontWeight: "600",
  },

  button: {
    marginTop: 16,
    backgroundColor: "#000000",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  helper: {
    marginTop: 10,
    fontSize: 12,
    color: "rgba(0,0,0,0.45)",
    textAlign: "center",
  },
});

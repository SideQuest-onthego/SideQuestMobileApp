import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import AuthBackground from "@/components/AuthBackground";

export default function RestrictionsScreen() {
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>([]);
  const [dietFilter, setDietFilter] = useState<boolean | null>(null);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      setSelected(selected.filter((o) => o !== option));
    } else {
      setSelected([...selected, option]);
    }
  };

  const handleNext = () => {
    if (dietFilter === true) {
      router.push("/(first-time)/dietary");
    } else {
      router.push("/(tabs)/home");
    }
  };

  const options = [
    "Wheelchair Access",
    "Quiet Space",
    "Elevator Access",
    "Seating",
    "Parking",
  ];

  return (
    <AuthBackground variant="tl">
      <View style={styles.center}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(first-time)/budget")}
        >
          <Text style={styles.backButtonText}>Back to Budget</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>Accessibility Needs</Text>
          <Text style={styles.subtitle}>
            Select any accessibility features you prefer
          </Text>

          <View style={styles.chipsRow}>
            {options.map((option) => {
              const active = selected.includes(option);

              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.chip,
                    { borderColor: "#000" },
                    active && styles.chipActive,
                  ]}
                  onPress={() => toggleOption(option)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 20 }]}>
            Would you like to filter based on diet?
          </Text>

          <View style={styles.chipsRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                { borderColor: "#000" },
                dietFilter === true && styles.chipActive,
              ]}
              onPress={() => setDietFilter(true)}
            >
              <Text
                style={[
                  styles.chipText,
                  dietFilter === true && styles.chipTextActive,
                ]}
              >
                Yes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                { borderColor: "#000" },
                dietFilter === false && styles.chipActive,
              ]}
              onPress={() => setDietFilter(false)}
            >
              <Text
                style={[
                  styles.chipText,
                  dietFilter === false && styles.chipTextActive,
                ]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
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

  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: "#fff",
  },

  /* changed blue → black */
  chipActive: {
    backgroundColor: "#5a8bff",
    borderColor: "#5a8bff",
  },

  chipText: {
    fontWeight: "700",
  },

  chipTextActive: {
    color: "#fff",
  },

  /* centered button */
  button: {
    marginTop: 24,
    backgroundColor: "#000000",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    width: "60%",
    alignSelf: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});

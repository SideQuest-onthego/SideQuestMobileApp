import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function BudgetScreen() {
  const router = useRouter();
  const [budget, setBudget] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    const numericBudget = Number(budget);

    if (!budget || isNaN(numericBudget) || numericBudget <= 0) {
      setError("Enter a valid budget.");
      return;
    }

    setError("");

    // Fixed: use string path with query param
    router.push(`/swipe?budget=${numericBudget}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Your Budget</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. 25"
        keyboardType="numeric"
        value={budget}
        onChangeText={setBudget}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#CFDAF1",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    color: "#0F672C",
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 10,
  },
  button: {
    marginTop: 20,
    backgroundColor: "#0F672C",
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
});
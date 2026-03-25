import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "@/FirebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import AuthBackground from "@/components/AuthBackground";

//Suggested budgets that users can quickly select from
const SUGGESTED = [10, 25, 50, 100];

export default function BudgetScreen() {
  const router = useRouter();
  const [budget, setBudget] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  //Saves budget to Firestore and navigates to next screen
  const handleContinue = async () => {
    const numericBudget = Number(budget);
    if (!budget || Number.isNaN(numericBudget) || numericBudget <= 0) {
      setError("Enter a valid budget");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Please log in first");
        setIsLoading(false);
        return;
      }

      // Save budget to Firestore under userPreferences
      await setDoc(
        doc(db, "userPreferences", user.uid),
        {
          budget: numericBudget,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      // Navigate to next screen with budget as backup param
      router.push(`/restrictions?budget=${numericBudget}`);
    } catch (err) {
      console.error("Failed to save budget:", err);
      setError("Failed to save budget. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  //Sets the budget to a suggested value when the user clicks on one of the chips
  //Converts the number to a string and clears any existing error message
  const setQuickBudget = (v: number) => {
    setBudget(String(v));
    setError("");
  };

  //Putting it all together
  return (
    <AuthBackground variant="tl">
      {/*Making sure the keyboard doesn't cover the input on iOS*/}
      {/*Adding padding to shift the content up*/}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.center}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/travel")}
          disabled={isLoading}
        >
          <Text style={styles.backButtonText}>Back to Travel</Text>
        </TouchableOpacity>

        {/*The main card container containing all the content*/}
        <View style={styles.card}>
          <Text style={styles.title}>Set your budget</Text>
          <Text style={styles.subtitle}>
            Discover places that won&apos;t break the bank
          </Text>

          <Text style={styles.label}>Budget</Text>

          <View style={styles.inputRow}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="15"
              keyboardType="numeric"
              value={budget}
              onChangeText={(t) => {
                {
                  /*Removes anything that is not a number from the imput to make sure it's always valid*/
                }
                const cleaned = t.replace(/[^\d]/g, "");
                setBudget(cleaned);
                if (error) setError("");
              }}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              editable={!isLoading}
            />
          </View>

          <View style={styles.chipsRow}>
            {/*Returns a chip for each suggested budget input*/}
            {SUGGESTED.map((v) => {
              const active = Number(budget) === v;
              return (
                <TouchableOpacity
                  key={v}
                  //Checks if the chip is active (the value matches the current budget)
                  //if so, applies a different style to indicate that the chip is selected
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setQuickBudget(v)}
                  disabled={isLoading}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    ${v}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/*When the user clicks continue, we validate the input and navigate to the next screen if it's valid*/}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Saving..." : "Continue"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helper}>You can update this anytime</Text>
        </View>
      </KeyboardAvoidingView>
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

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  dollar: {
    fontSize: 18,
    fontWeight: "800",
    color: "rgba(0,0,0,0.5)",
    marginRight: 6,
  },

  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
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

  chipActive: {
    backgroundColor: "#0d8474",
    borderColor: "#0d8474",
  },

  chipText: {
    fontWeight: "700",
  },

  chipTextActive: {
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

  buttonDisabled: {
    opacity: 0.6,
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

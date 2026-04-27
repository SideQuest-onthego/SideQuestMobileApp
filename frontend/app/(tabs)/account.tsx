import { IconSymbol } from "@/components/ui/icon-symbol";
import { LogoutButton } from "@/components/logout-button";
import { auth, db } from "@/FirebaseConfig";
import { useLocation } from "@/context/LocationContext";
import Slider from "@react-native-community/slider";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useReducer, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

//Options arrays for dietary restrictions and accessibility needs
const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Halal",
  "Kosher",
  "Dairy-Free",
  "Nut-Free",
  "Pescatarian",
];
const ACCESSIBILITY_OPTIONS = [
  "Wheelchair Access",
  "Quiet Space",
  "Elevator Access",
  "Seating",
  "Parking",
  "None",
];

//State management for user preferences using useReducer
type PreferencesState = {
  budget: number;
  dietaryRestrictions: string[];
  accessibilityNeeds: string[];
};

type PreferencesDocument = PreferencesState & {
  distance?: number; // Distance from Firestore
  updatedAt?: unknown;
};

//Action types for updating preferences state
type Action =
  | { type: "SET_BUDGET"; value: number }
  | { type: "TOGGLE_DIETARY"; value: string }
  | { type: "TOGGLE_ACCESSIBILITY"; value: string }
  | { type: "REPLACE_ALL"; value: PreferencesState };

//Initial state for preferences with default values (distance is now in LocationContext)
const initialState: PreferencesState = {
  budget: 25,
  dietaryRestrictions: [],
  accessibilityNeeds: [],
};

//Handles toggling items in arrays for dietary restrictions and accessibility needs when user selects/unselects options
function toggleItem(items: string[], value: string) {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

//Reducer function (current state + action) => new state based on action type
function preferencesReducer(
  state: PreferencesState,
  action: Action,
): PreferencesState {
  switch (action.type) {
    case "SET_BUDGET":
      return { ...state, budget: action.value };

    case "TOGGLE_DIETARY":
      return {
        ...state,
        dietaryRestrictions: toggleItem(
          state.dietaryRestrictions,
          action.value,
        ),
      };

    case "TOGGLE_ACCESSIBILITY":
      return {
        ...state,
        accessibilityNeeds: toggleItem(state.accessibilityNeeds, action.value),
      };

    case "REPLACE_ALL":
      return action.value;

    default:
      return state;
  }
}

//Main account screen component
export default function AccountScreen() {
  const router = useRouter();

  // Get distance from LocationContext (synced across all screens)
  const { radiusMiles, setRadiusMiles } = useLocation();

  const [displayName, setDisplayName] = useState("your_name");
  const [state, dispatch] = useReducer(preferencesReducer, initialState);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [saveError, setSaveError] = useState("");

  const refreshDisplayName = useCallback(() => {
    setDisplayName(auth.currentUser?.displayName?.trim() || "your_name");
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setDisplayName(user?.displayName?.trim() || "your_name");

      if (!user) {
        dispatch({ type: "REPLACE_ALL", value: initialState });
        setRadiusMiles(10); // Reset distance to default
        setHasLoadedPreferences(true);
        setSaveError("");
        return;
      }

      setHasLoadedPreferences(false);

      try {
        const preferencesRef = doc(db, "userPreferences", user.uid);
        const snapshot = await getDoc(preferencesRef);

        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<PreferencesDocument>;

          // Sync distance from Firestore to LocationContext
          if (typeof data.distance === "number") {
            setRadiusMiles(data.distance);
          }

          dispatch({
            type: "REPLACE_ALL",
            value: {
              budget:
                typeof data.budget === "number"
                  ? data.budget
                  : initialState.budget,
              dietaryRestrictions: Array.isArray(data.dietaryRestrictions)
                ? data.dietaryRestrictions.filter(
                    (item): item is string => typeof item === "string",
                  )
                : initialState.dietaryRestrictions,
              accessibilityNeeds: Array.isArray(data.accessibilityNeeds)
                ? data.accessibilityNeeds.filter(
                    (item): item is string => typeof item === "string",
                  )
                : initialState.accessibilityNeeds,
            },
          });
        } else {
          dispatch({ type: "REPLACE_ALL", value: initialState });
        }

        setSaveError("");
      } catch (error) {
        console.error("Failed to load user preferences:", error);
        setSaveError("Couldn't load saved preferences.");
        dispatch({ type: "REPLACE_ALL", value: initialState });
      } finally {
        setHasLoadedPreferences(true);
      }
    });

    return unsubscribe;
  }, [setRadiusMiles]);

  // Save preferences to Firestore whenever they change
  useEffect(() => {
    if (!hasLoadedPreferences || !auth.currentUser) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        await setDoc(
          doc(db, "userPreferences", auth.currentUser!.uid),
          {
            ...state,
            distance: radiusMiles, // Include distance from context
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        setSaveError("");
      } catch (error) {
        console.error("Failed to save user preferences:", error);
        setSaveError("Couldn't save changes.");
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [hasLoadedPreferences, state, radiusMiles]);

  useFocusEffect(
    useCallback(() => {
      refreshDisplayName();
    }, [refreshDisplayName]),
  );

  return (
    //ScrollView allows the content to be scrollable in case of smaller screen sizes or if user has many preferences selected
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Using the logout button component, from yours truly Arman */}
      <View style={styles.headerRow}>
        <LogoutButton label="Log Out" redirectTo="/" size="compact" />
      </View>

      {/* User profile section (profile icon + edit button) */}
      <View style={styles.iconWrap}>
        <IconSymbol name="person.crop.circle.fill" size={92} color="#102C26" />
        <Pressable
          style={styles.editButton}
          onPress={() => router.push("/account-profile")}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
      </View>

      <Text style={styles.welcomeText}>Welcome {displayName}</Text>
      {saveError ? <Text style={styles.statusText}>{saveError}</Text> : null}

      {/* Distance preference card - NOW SYNCED WITH MAP AND DISTANCE SCREENS */}
      <View style={styles.card}>
        <View style={styles.sliderHeader}>
          <Text style={styles.cardTitle}>Distance</Text>
          <Text style={styles.sliderValue}>{radiusMiles} mi</Text>
        </View>
        {/* Slider for adjusting distance preference - updates LocationContext */}
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={50}
          step={0.5}
          value={radiusMiles}
          onValueChange={(value) => setRadiusMiles(value)}
          minimumTrackTintColor="#102C26"
          maximumTrackTintColor="#D1D5DB"
          thumbTintColor="#102C26"
        />
      </View>

      {/* Budget preference card*/}
      <View style={styles.card}>
        <View style={styles.sliderHeader}>
          <Text style={styles.cardTitle}>Budget</Text>
          <Text style={styles.sliderValue}>${state.budget}</Text>
        </View>
        {/* Slider for adjusting budget preference */}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1000}
          step={5}
          value={state.budget}
          onValueChange={(value) => dispatch({ type: "SET_BUDGET", value })}
          minimumTrackTintColor="#102C26"
          maximumTrackTintColor="#D1D5DB"
          thumbTintColor="#102C26"
        />
      </View>

      {/* Dietary restrictions preference card*/}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dietary Restrictions</Text>
        <View style={styles.chipContainer}>
          {DIETARY_OPTIONS.map((option) => {
            const isSelected = state.dietaryRestrictions.includes(option);
            //Renders each dietary option as a chip that can be selected/deselected by the user
            return (
              <Pressable
                key={option}
                style={[styles.chip, isSelected && styles.selectedChip]}
                onPress={() =>
                  dispatch({ type: "TOGGLE_DIETARY", value: option })
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.selectedChipText,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Accessibility needs preference card*/}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accessibility Needs</Text>
        <View style={styles.chipContainer}>
          {ACCESSIBILITY_OPTIONS.map((option) => {
            const isSelected = state.accessibilityNeeds.includes(option);
            //Renders each accessibility option as a chip that can be selected/deselected by the user
            return (
              <Pressable
                key={option}
                style={[styles.chip, isSelected && styles.selectedChip]}
                onPress={() =>
                  dispatch({
                    type: "TOGGLE_ACCESSIBILITY",
                    value: option,
                  })
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.selectedChipText,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DBFEF7",
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
    backgroundColor: "#102C26",
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
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  statusText: {
    width: "100%",
    maxWidth: 320,
    marginBottom: 12,
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "500",
  },
  headerRow: {
    width: "100%",
    maxWidth: 320,
    alignItems: "flex-end",
    marginTop: 20,
    marginBottom: 18,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  selectedChip: {
    backgroundColor: "#102C26",
    borderColor: "#102C26",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  selectedChipText: {
    color: "#FFFFFF",
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 120,
  },
});

import { IconSymbol } from "@/components/ui/icon-symbol";
import { LogoutButton } from "@/components/logout-button";
import { auth } from "@/FirebaseConfig";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useReducer, useState } from "react";
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
   "Parking",
];

//State management for user preferences using useReducer
type PreferencesState = {
   distance: number;
   budget: number;
   dietaryRestrictions: string[];
   accessibilityNeeds: string[];
};

//Action types for updating preferences state
type Action =
   | { type: "SET_DISTANCE"; value: number }
   | { type: "SET_BUDGET"; value: number }
   | { type: "TOGGLE_DIETARY"; value: string }
   | { type: "TOGGLE_ACCESSIBILITY"; value: string };

//Initial state for preferences with default values
const initialState: PreferencesState = {
   distance: 10,
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
      case "SET_DISTANCE":
         return { ...state, distance: action.value };

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
            accessibilityNeeds: toggleItem(
               state.accessibilityNeeds,
               action.value,
            ),
         };

      default:
         return state;
   }
}

//Main account screen component
export default function AccountScreen() {
   const router = useRouter();
   const [displayName, setDisplayName] = useState("your_name");
   const [state, dispatch] = useReducer(preferencesReducer, initialState);

   useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
         setDisplayName(user?.displayName?.trim() || "your_name");
      });

      return unsubscribe;
   }, []);

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
            <IconSymbol
               name="person.crop.circle.fill"
               size={92}
               color="#102C26"
            />
            <Pressable
               style={styles.editButton}
               onPress={() => router.push("/account-profile")}
            >
               <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
         </View>

         <Text style={styles.welcomeText}>Welcome {displayName}</Text>

         {/* Distance preference card*/}
         <View style={styles.card}>
            <View style={styles.sliderHeader}>
               <Text style={styles.cardTitle}>Distance</Text>
               <Text style={styles.sliderValue}>{state.distance} mi</Text>
            </View>
            {/* Slider for adjusting distance preference */}
            <Slider
               style={styles.slider}
               minimumValue={1}
               maximumValue={100}
               step={1}
               value={state.distance}
               onValueChange={(value) =>
                  dispatch({ type: "SET_DISTANCE", value })
               }
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
               onValueChange={(value) =>
                  dispatch({ type: "SET_BUDGET", value })
               }
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
      marginBottom: 20,
      fontSize: 18,
      fontWeight: "600",
      color: "#111827",
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

import AuthBackground from "@/components/AuthBackground";
import { auth, db } from "@/FirebaseConfig";
import { useRouter } from "expo-router";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useEffect, useReducer, useState } from "react";
import {
   ActivityIndicator,
   Pressable,
   ScrollView,
   StyleSheet,
   Text,
   TouchableOpacity,
   View,
} from "react-native";

// RECYCLED FROM ACCOUNT.TSX
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

type DietaryState = {
   dietaryRestrictions: string[];
};

type PreferencesDocument = {
   dietaryRestrictions?: unknown;
};

type Action =
   | { type: "TOGGLE_DIETARY"; value: string }
   | { type: "REPLACE_ALL"; value: DietaryState };

const initialState: DietaryState = {
   dietaryRestrictions: [],
};

function preferencesReducer(state: DietaryState, action: Action): DietaryState {
   switch (action.type) {
      case "TOGGLE_DIETARY":
         return {
            dietaryRestrictions: state.dietaryRestrictions.includes(
               action.value,
            )
               ? state.dietaryRestrictions.filter(
                    (item) => item !== action.value,
                 )
               : [...state.dietaryRestrictions, action.value],
         };

      case "REPLACE_ALL":
         return action.value;

      default:
         return state;
   }
}

export default function DietaryScreen() {
   const router = useRouter();
   const [state, dispatch] = useReducer(preferencesReducer, initialState);
   const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
   const [statusMessage, setStatusMessage] = useState("");
   const [isContinuing, setIsContinuing] = useState(false);

   useEffect(() => {
      let isMounted = true;

      async function loadPreferences() {
         const user = auth.currentUser;

         if (!user) {
            if (isMounted) {
               setHasLoadedPreferences(true);
               setStatusMessage("Sign in to save dietary preferences.");
            }
            return;
         }

         try {
            const preferencesRef = doc(db, "userPreferences", user.uid);
            const snapshot = await getDoc(preferencesRef);

            if (!isMounted) {
               return;
            }

            if (snapshot.exists()) {
               const data = snapshot.data() as PreferencesDocument;
               dispatch({
                  type: "REPLACE_ALL",
                  value: {
                     dietaryRestrictions: Array.isArray(
                        data.dietaryRestrictions,
                     )
                        ? data.dietaryRestrictions.filter(
                             (item): item is string => typeof item === "string",
                          )
                        : [],
                  },
               });
            }

            setStatusMessage("");
         } catch (error) {
            console.error("Failed to load dietary preferences:", error);
            if (isMounted) {
               setStatusMessage("Couldn't load saved preferences.");
            }
         } finally {
            if (isMounted) {
               setHasLoadedPreferences(true);
            }
         }
      }

      loadPreferences();

      return () => {
         isMounted = false;
      };
   }, []);

   useEffect(() => {
      if (!hasLoadedPreferences || !auth.currentUser) {
         return;
      }

      const timeoutId = setTimeout(async () => {
         try {
            await setDoc(
               doc(db, "userPreferences", auth.currentUser!.uid),
               {
                  dietaryRestrictions: state.dietaryRestrictions,
                  updatedAt: serverTimestamp(),
               },
               { merge: true },
            );
            setStatusMessage("");
         } catch (error) {
            console.error("Failed to save dietary preferences:", error);
            setStatusMessage("Couldn't save changes.");
         }
      }, 300);

      return () => clearTimeout(timeoutId);
   }, [hasLoadedPreferences, state.dietaryRestrictions]);

   async function persistDietaryPreferences() {
      if (!auth.currentUser) {
         setStatusMessage("Sign in to save dietary preferences.");
         return false;
      }

      try {
         await setDoc(
            doc(db, "userPreferences", auth.currentUser.uid),
            {
               dietaryRestrictions: state.dietaryRestrictions,
               updatedAt: serverTimestamp(),
            },
            { merge: true },
         );
         setStatusMessage("");
         return true;
      } catch (error) {
         console.error("Failed to save dietary preferences:", error);
         setStatusMessage("Couldn't save changes.");
         return false;
      }
   }

   async function handleContinue() {
      setIsContinuing(true);
      await persistDietaryPreferences();
      setIsContinuing(false);
      router.replace("/(tabs)/home");
   }

   const selectedCount = state.dietaryRestrictions.length;
   const selectionLabel =
      selectedCount === 0
         ? "No dietary filters selected yet"
         : selectedCount === 1
           ? "1 dietary preference selected"
           : `${selectedCount} dietary preferences selected`;

   // CODE RECYCLED FROM BUDGET.TSX
   return (
      <AuthBackground variant="tl">
         <ScrollView contentContainerStyle={styles.center}>
            <TouchableOpacity
               style={styles.backButton}
               onPress={() => router.push("/(first-time)/restrictions")}
            >
               <Text style={styles.backButtonText}>
                  {"Back to Accessibility"}
               </Text>
            </TouchableOpacity>

            <View style={styles.card}>
               <Text style={styles.title}>Set your dietary preferences</Text>
               <Text style={styles.subtitle}>
                  Discover places that fit the way you eat
               </Text>

               <Text style={styles.label}>Dietary Restrictions</Text>

               <View style={styles.inputRow}>
                  <View style={styles.chipsRow}>
                     {DIETARY_OPTIONS.map((option) => {
                        const isSelected =
                           state.dietaryRestrictions.includes(option);

                        return (
                           <Pressable
                              key={option}
                              style={[
                                 styles.chip,
                                 isSelected && styles.chipActive,
                              ]}
                              onPress={() =>
                                 dispatch({
                                    type: "TOGGLE_DIETARY",
                                    value: option,
                                 })
                              }
                           >
                              <Text
                                 style={[
                                    styles.chipText,
                                    isSelected && styles.chipTextActive,
                                 ]}
                              >
                                 {option}
                              </Text>
                           </Pressable>
                        );
                     })}
                  </View>

                  <Text style={styles.helper}>{selectionLabel}</Text>
               </View>

               <TouchableOpacity
                  style={styles.button}
                  onPress={handleContinue}
                  disabled={isContinuing}
               >
                  {isContinuing ? (
                     <ActivityIndicator color="#fff" />
                  ) : (
                     <Text style={styles.buttonText}>Continue</Text>
                  )}
               </TouchableOpacity>
            </View>
         </ScrollView>
      </AuthBackground>
   );
}

// CSS/STYLING RECYCLED FROM BUDGET.TSX
const styles = StyleSheet.create({
   center: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingTop: 120,
      paddingBottom: 40,
   },

   backButton: {
      position: "absolute",
      top: 60,
      left: 20,
      zIndex: 1,
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
      textAlign: "center",
   },

   subtitle: {
      marginTop: 6,
      marginBottom: 16,
      fontSize: 13,
      color: "rgba(0,0,0,0.55)",
      textAlign: "center",
   },

   label: {
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 8,
   },

   inputRow: {
      backgroundColor: "#fff",
      borderRadius: 14,
      borderWidth: 1.5,
      paddingHorizontal: 12,
      paddingVertical: 12,
   },

   chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
   },

   chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1.5,
      backgroundColor: "#fff",
   },

   chipActive: {
      backgroundColor: "#5a8bff",
      borderColor: "#5a8bff",
   },

   chipText: {
      fontWeight: "700",
      color: "#111",
   },

   chipTextActive: {
      color: "#fff",
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
      color: "rgba(0,0,0,0.55)",
      textAlign: "center",
   },
});

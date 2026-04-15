/**
 * typescript model for User Preferences 
 */

import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/FirebaseConfig";

// userPreferences for POI search only
export type UserSearchPreferences = {
  budget: number;
  distance: number;
};

// WILL HAVE TO ADD USER PREFERENCES FOR RESTAURANTS FOR ITINERARIES

export const DEFAULT_PREFERENCES: UserSearchPreferences = {
  budget: 25,
  distance: 10,
};

export async function loadUserSearchPreferences(): Promise<UserSearchPreferences> {
  const user = auth.currentUser;

  // if there is no User logged in (only for dev purposes)
  if (!user) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const snapshot = await getDoc(doc(db, "userPreferences", user.uid));

    if (!snapshot.exists()) {
      return DEFAULT_PREFERENCES;
    }

    const data = snapshot.data();

    return {
      budget:
        typeof data.budget === "number" && data.budget > 0
          ? data.budget
          : DEFAULT_PREFERENCES.budget,
      distance:
        typeof data.distance === "number" && data.distance > 0
          ? data.distance
          : DEFAULT_PREFERENCES.distance,
    };
  } catch (error) {
    console.error("Failed to load search preferences:", error);
    return DEFAULT_PREFERENCES;
  }
}

// frontend/app/SavedPlacesContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { ActivityModel } from "../types/sidequest-models";
import { auth } from "../FirebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../FirebaseConfig";

// Type definition for the context
type SavedPlacesContextType = {
  savedPlaces: ActivityModel[];        // Array of saved places
  addPlace: (place: ActivityModel) => void; // Function to add a place
  removePlace: (placeId: string) => void;   // Function to remove a place by ID
};

// Create context; initially undefined
const SavedPlacesContext = createContext<SavedPlacesContextType | undefined>(undefined);

// Custom hook to access SavedPlacesContext
export function useSavedPlaces() {
  const context = useContext(SavedPlacesContext);
  if (!context) throw new Error("useSavedPlaces must be used inside SavedPlacesProvider");
  return context;
}

// Provider component that wraps app parts needing saved places
export function SavedPlacesProvider({ children }: { children: ReactNode }) {
  const [savedPlaces, setSavedPlaces] = useState<ActivityModel[]>([]);
  const [user, setUser] = useState<User | null>(null);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe; // Cleanup on unmount
  }, []);

  // Load saved places from Firestore when user changes
  useEffect(() => {
    if (!user) {
      setSavedPlaces([]);
      return;
    }

    const fetchSaved = async () => {
      try {
        const docRef = doc(db, "savedPlaces", user.uid);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const savedData: ActivityModel[] = snapshot.data().saved || [];
          setSavedPlaces(savedData.map(p => ({ ...p, id: p.id || crypto.randomUUID() })));
        } else {
          setSavedPlaces([]);
        }
      } catch (e) {
        console.error("Failed to fetch saved places:", e);
      }
    };

    fetchSaved();
  }, [user]);

  // Save updated places to Firestore
  const saveToFirestore = async (places: ActivityModel[]) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "savedPlaces", user.uid), { saved: places }, { merge: true });
    } catch (e) {
      console.error("Failed to update Firestore:", e);
    }
  };

  // Add a new place to saved list
  const addPlace = (place: ActivityModel) => {
    const placeWithId = { ...place, id: place.id || crypto.randomUUID() };
    setSavedPlaces(prev => {
      if (prev.some(p => p.id === placeWithId.id)) return prev;
      const newList = [...prev, placeWithId];
      saveToFirestore(newList);
      return newList;
    });
  };

  // Remove a place from saved list by ID
  const removePlace = (placeId: string) => {
    setSavedPlaces(prev => {
      const newList = prev.filter(p => p.id !== placeId);
      saveToFirestore(newList);
      return newList;
    });
  };

  return (
    <SavedPlacesContext.Provider value={{ savedPlaces, addPlace, removePlace }}>
      {children}
    </SavedPlacesContext.Provider>
  );
}
// frontend/app/SavedPlacesContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { ActivityModel } from "../types/sidequest-models";
import { auth } from "../FirebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../FirebaseConfig";

type SavedPlacesContextType = {
  savedPlaces: ActivityModel[];
  addPlace: (place: ActivityModel) => void;
  removePlace: (placeId: string) => void;
};

const SavedPlacesContext = createContext<SavedPlacesContextType | undefined>(undefined);

export function useSavedPlaces() {
  const context = useContext(SavedPlacesContext);
  if (!context) throw new Error("useSavedPlaces must be used inside SavedPlacesProvider");
  return context;
}

export function SavedPlacesProvider({ children }: { children: ReactNode }) {
  const [savedPlaces, setSavedPlaces] = useState<ActivityModel[]>([]);
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

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
          console.log("Loaded saved places:", savedData);
        } else {
          setSavedPlaces([]);
        }
      } catch (e) {
        console.error("Failed to fetch saved places:", e);
      }
    };

    fetchSaved();
  }, [user]);

  const saveToFirestore = async (places: ActivityModel[]) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "savedPlaces", user.uid), { saved: places }, { merge: true });
      console.log("Saved places to Firestore:", places);
    } catch (e) {
      console.error("Failed to update Firestore:", e);
    }
  };

  const addPlace = (place: ActivityModel) => {
    const placeWithId = { ...place, id: place.id || crypto.randomUUID() };
    setSavedPlaces(prev => {
      if (prev.some(p => p.id === placeWithId.id)) return prev;
      const newList = [...prev, placeWithId];
      saveToFirestore(newList);
      return newList;
    });
  };

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
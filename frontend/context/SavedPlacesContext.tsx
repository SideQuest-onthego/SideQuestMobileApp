// frontend/app/SavedPlacesContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { ActivityModel } from "../types/sidequest-models";
import { auth } from "../FirebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../FirebaseConfig";

type SavedPlacesContextType = {
  savedPlaces: ActivityModel[];
  itineraryPlaces: ActivityModel[];

  addPlace: (place: ActivityModel) => void;
  removePlace: (placeId: string) => void;

  addToItinerary: (place: ActivityModel) => void;
  removeFromItinerary: (placeId: string) => void;
};



const SavedPlacesContext = createContext<
  SavedPlacesContextType | undefined
>(undefined);

// removes undefined values before saving to Firestore
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    ) as T;
  }

  return value;
}

export function useSavedPlaces() {
  const context = useContext(SavedPlacesContext);
  if (!context)
    throw new Error("useSavedPlaces must be used inside SavedPlacesProvider");
  return context;
}

export function SavedPlacesProvider({ children }: { children: ReactNode }) {
  const [savedPlaces, setSavedPlaces] = useState<ActivityModel[]>([]);
  const [itineraryPlaces, setItineraryPlaces] = useState<ActivityModel[]>([]);
  const [user, setUser] = useState<User | null>(auth.currentUser);

  // auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
  console.log("Itinerary places updated:", itineraryPlaces);
}, [itineraryPlaces]);

  // load saved places
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
          const savedData: ActivityModel[] =
            snapshot.data().saved || [];

          setSavedPlaces(
            savedData.map((p) => ({
              ...p,
              id: p.id || crypto.randomUUID(),
            })),
          );
        } else {
          setSavedPlaces([]);
        }
      } catch (e) {
        console.error("Failed to fetch saved places:", e);
      }
    };

    fetchSaved();
  }, [user]);

  // firestore sync
  const saveToFirestore = async (places: ActivityModel[]) => {
    if (!user) return;

    try {
      await setDoc(
        doc(db, "savedPlaces", user.uid),
        { saved: stripUndefined(places) },
        { merge: true },
      );
    } catch (e) {
      console.error("Failed to update Firestore:", e);
    }
  };

  // saved places
  const addPlace = (place: ActivityModel) => {
    const placeWithId = {
      ...place,
      id: place.id || crypto.randomUUID(),
    };

    setSavedPlaces((prev) => {
      if (prev.some((p) => p.id === placeWithId.id)) return prev;
      const updated = [...prev, placeWithId];
      saveToFirestore(updated);
      return updated;
    });
  };

  const removePlace = (placeId: string) => {
    setSavedPlaces((prev) => {
      const updated = prev.filter((p) => p.id !== placeId);
      saveToFirestore(updated);
      return updated;
    });
    setItineraryPlaces((prev) => prev.filter((p) => p.id !== placeId));
  };

  // itinerary logic
  const addToItinerary = (place: ActivityModel) => {
    setItineraryPlaces((prev) => {
      if (prev.some((p) => p.id === place.id)) return prev;
      if (prev.length >= 5) return prev;
      return [...prev, place];
    });
  };

  const removeFromItinerary = (placeId: string) => {
    setItineraryPlaces((prev) =>
      prev.filter((p) => p.id !== placeId),
    );
  };

  return (
    <SavedPlacesContext.Provider
      value={{
        savedPlaces,
        itineraryPlaces,
        addPlace,
        removePlace,
        addToItinerary,
        removeFromItinerary,
      }}
    >
      {children}
    </SavedPlacesContext.Provider>
  );
}
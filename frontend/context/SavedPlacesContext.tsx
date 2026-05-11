// frontend/app/SavedPlacesContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import type { ActivityModel } from "../types/sidequest-models";
import type { ItineraryResult } from "@/types/itinerary";
import {
  MAX_ITINERARY_PLACES,
  MIN_ITINERARY_PLACES,
  canAddPlaceWithinBudget,
  generateItineraryResult,
} from "@/services/itineraryEngine";
import { DEFAULT_PREFERENCES } from "@/services/userPreferences";
import { auth } from "../FirebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../FirebaseConfig";

type SavedPlacesContextType = {
  savedPlaces: ActivityModel[];
  itineraryPlaces: ActivityModel[];
  generatedItinerary: ItineraryResult | null;

  addPlace: (place: ActivityModel) => void;
  removePlace: (placeId: string) => void;

  addToItinerary: (place: ActivityModel) => AddToItineraryResult;
  removeFromItinerary: (placeId: string) => void;
  generateItinerary: () => void;
};

type AddToItineraryResult = "added" | "duplicate" | "full" | "over-budget";

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
  const [generatedItinerary, setGeneratedItinerary] =
    useState<ItineraryResult | null>(null);
  const [itineraryBudget, setItineraryBudget] = useState(
    DEFAULT_PREFERENCES.budget,
  );
  const [user, setUser] = useState<User | null>(auth.currentUser);

  // auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setItineraryBudget(DEFAULT_PREFERENCES.budget);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "userPreferences", user.uid),
      (snapshot) => {
        const data = snapshot.data();
        setItineraryBudget(
          typeof data?.budget === "number" && data.budget > 0
            ? data.budget
            : DEFAULT_PREFERENCES.budget,
        );
      },
      (error) => {
        console.error("Failed to load itinerary budget:", error);
        setItineraryBudget(DEFAULT_PREFERENCES.budget);
      },
    );

    return unsubscribe;
  }, [user]);

  // load saved places
  useEffect(() => {
    if (!user) {
      setSavedPlaces([]);
      setItineraryPlaces([]);
      setGeneratedItinerary(null);
      return;
    }

    const fetchSaved = async () => {
      try {
        const docRef = doc(db, "savedPlaces", user.uid);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const savedData: ActivityModel[] = snapshot.data().saved || [];
          const itinerarySelection: ActivityModel[] = (
            snapshot.data().itinerarySelection || []
          ).slice(0, MAX_ITINERARY_PLACES);
          const normalizedItinerarySelection = itinerarySelection.map((p) => ({
            ...p,
            id: p.id || crypto.randomUUID(),
          }));

          setSavedPlaces(
            savedData.map((p) => ({
              ...p,
              id: p.id || crypto.randomUUID(),
            })),
          );

          setItineraryPlaces(normalizedItinerarySelection);

          setGeneratedItinerary(
            generateItineraryResult(normalizedItinerarySelection),
          );
        } else {
          setSavedPlaces([]);
          setItineraryPlaces([]);
          setGeneratedItinerary(null);
        }
      } catch (e) {
        console.error("Failed to fetch saved places:", e);
      }
    };

    fetchSaved();
  }, [user]);

  // firestore sync
  const saveToFirestore = async (
    places: ActivityModel[],
    itinerarySelection: ActivityModel[] = itineraryPlaces,
    itinerary: ItineraryResult | null = generatedItinerary,
  ) => {
    if (!user) return;

    try {
      await setDoc(
        doc(db, "savedPlaces", user.uid),
        {
          saved: stripUndefined(places),
          itinerarySelection: stripUndefined(itinerarySelection),
          generatedItinerary: stripUndefined(itinerary),
        },
        { merge: true },
      );
    } catch (e) {
      console.error("Failed to update Firestore:", e);
    }
  };

  // ITINERARY TEMP STATE TO SEE IF IT CAN CALL FUNCTION
  const persistItineraryState = useCallback(
    (selection: ActivityModel[], itinerary: ItineraryResult | null) => {
      void saveToFirestore(savedPlaces, selection, itinerary);
    },
    [savedPlaces],
  );

  useEffect(() => {
    if (
      itineraryPlaces.length >= MIN_ITINERARY_PLACES &&
      !generatedItinerary
    ) {
      const nextGenerated = generateItineraryResult(itineraryPlaces); // function comes from services/itineraryEngine.ts
      console.log("Generated itinerary result:", nextGenerated); // console log to see what the itinerary object looks like
      setGeneratedItinerary(nextGenerated);
      persistItineraryState(itineraryPlaces, nextGenerated);
    }

    if (
      itineraryPlaces.length < MIN_ITINERARY_PLACES &&
      generatedItinerary
    ) {
      setGeneratedItinerary(null);
      persistItineraryState(itineraryPlaces, null);
    }
  }, [
    generatedItinerary,
    itineraryPlaces,
    persistItineraryState,
  ]);

  useEffect(() => {
    if (
      itineraryPlaces.length >= MIN_ITINERARY_PLACES &&
      generatedItinerary
    ) {
      console.warn(
        "Generated itinerary available:",
        JSON.stringify(generatedItinerary, null, 2),
      );
    }
  }, [generatedItinerary, itineraryPlaces.length]);

  // saved places
  const addPlace = (place: ActivityModel) => {
    const placeWithId = {
      ...place,
      id: place.id || crypto.randomUUID(),
    };

    setSavedPlaces((prev) => {
      if (prev.some((p) => p.id === placeWithId.id)) return prev;
      const updated = [...prev, placeWithId];
      void saveToFirestore(updated);
      return updated;
    });
  };

  const removePlace = (placeId: string) => {
    setSavedPlaces((prev) => {
      const updated = prev.filter((p) => p.id !== placeId);
      const updatedSelection = itineraryPlaces.filter((p) => p.id !== placeId);
      const nextGenerated = generateItineraryResult(updatedSelection);

      setItineraryPlaces(updatedSelection);
      setGeneratedItinerary(nextGenerated);
      void saveToFirestore(updated, updatedSelection, nextGenerated);
      return updated;
    });
  };

  // itinerary logic
  const addToItinerary = (place: ActivityModel) => {
    if (itineraryPlaces.some((p) => p.id === place.id)) return "duplicate";
    if (itineraryPlaces.length >= MAX_ITINERARY_PLACES) return "full";
    if (!canAddPlaceWithinBudget(itineraryPlaces, place, itineraryBudget)) {
      return "over-budget";
    }

    setItineraryPlaces((prev) => {
      if (prev.some((p) => p.id === place.id)) return prev;
      if (prev.length >= MAX_ITINERARY_PLACES) return prev;
      if (!canAddPlaceWithinBudget(prev, place, itineraryBudget)) return prev;

      const updated = [...prev, place];
      const nextGenerated = generateItineraryResult(updated);
      if (updated.length >= MIN_ITINERARY_PLACES) {
        console.log("Generated itinerary result:", nextGenerated);
      }
      setGeneratedItinerary(nextGenerated);
      persistItineraryState(updated, nextGenerated);
      return updated;
    });

    return "added";
  };

  const removeFromItinerary = (placeId: string) => {
    setItineraryPlaces((prev) => {
      const updated = prev.filter((p) => p.id !== placeId);
      const nextGenerated = generateItineraryResult(updated);
      setGeneratedItinerary(nextGenerated);
      persistItineraryState(updated, nextGenerated);
      return updated;
    });
  };

  const generateItinerary = useCallback(() => {
    const nextGenerated = generateItineraryResult(itineraryPlaces);
    if (itineraryPlaces.length >= MIN_ITINERARY_PLACES) {
      console.log("Generated itinerary result:", nextGenerated);
    }
    setGeneratedItinerary(nextGenerated);
    persistItineraryState(itineraryPlaces, nextGenerated);
  }, [itineraryPlaces, persistItineraryState]);

  return (
    <SavedPlacesContext.Provider
      value={{
        savedPlaces,
        itineraryPlaces,
        generatedItinerary,
        addPlace,
        removePlace,
        addToItinerary,
        removeFromItinerary,
        generateItinerary,
      }}
    >
      {children}
    </SavedPlacesContext.Provider>
  );
}

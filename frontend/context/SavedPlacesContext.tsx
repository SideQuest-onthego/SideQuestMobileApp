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
import { auth } from "../FirebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../FirebaseConfig";

export type GeneratedItineraryStop = {
  order: number;
  placeId: string;
  startTime: string;
  endTime: string;
  travelTimeMinsFromPrevious: number;
  travelDistanceMilesFromPrevious: number;
  durationMins: number;
};

export type GeneratedItinerary = {
  title: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  totalStops: number;
  totalActivityMinutes: number;
  totalTravelMinutes: number;
  totalEstimatedCost: number;
  stops: GeneratedItineraryStop[];
};

type SavedPlacesContextType = {
  savedPlaces: ActivityModel[];
  itineraryPlaces: ActivityModel[];
  generatedItinerary: GeneratedItinerary | null;

  addPlace: (place: ActivityModel) => void;
  removePlace: (placeId: string) => void;

  addToItinerary: (place: ActivityModel) => void;
  removeFromItinerary: (placeId: string) => void;
  generateItinerary: () => void;
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

export function SavedPlacesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [savedPlaces, setSavedPlaces] = useState<ActivityModel[]>([]);
  const [itineraryPlaces, setItineraryPlaces] = useState<ActivityModel[]>([]);
  const [generatedItinerary, setGeneratedItinerary] =
    useState<GeneratedItinerary | null>(null);
  const [user, setUser] = useState<User | null>(auth.currentUser);

  // auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

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
          const itinerarySelection: ActivityModel[] =
            snapshot.data().itinerarySelection || [];
          const savedGeneratedItinerary: GeneratedItinerary | null =
            snapshot.data().generatedItinerary || null;

          setSavedPlaces(
            savedData.map((p) => ({
              ...p,
              id: p.id || crypto.randomUUID(),
            })),
          );

          setItineraryPlaces(
            itinerarySelection.map((p) => ({
              ...p,
              id: p.id || crypto.randomUUID(),
            })),
          );

          setGeneratedItinerary(savedGeneratedItinerary);
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
    itinerary: GeneratedItinerary | null = generatedItinerary,
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

  const getDistanceMiles = (
    from: ActivityModel,
    to: ActivityModel,
  ): number => {
    const lat1 = from.location.lat;
    const lon1 = from.location.lng;
    const lat2 = to.location.lat;
    const lon2 = to.location.lng;

    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const formatClock = (minutesSinceMidnight: number) => {
    const normalized = ((minutesSinceMidnight % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    const minuteLabel = minutes.toString().padStart(2, "0");
    return `${hour12}:${minuteLabel} ${suffix}`;
  };

  const getAveragePrice = (place: ActivityModel) => {
    const min = place.estimatedCost?.min ?? 0;
    const max = place.estimatedCost?.max ?? 0;
    return Math.round((min + max) / 2);
  };

  const buildGeneratedItinerary = useCallback(
    (places: ActivityModel[]): GeneratedItinerary | null => {
      if (places.length < 5) {
        return null;
      }

      const remaining = [...places];
      const centroid = remaining.reduce(
        (acc, place) => ({
          lat: acc.lat + place.location.lat,
          lng: acc.lng + place.location.lng,
        }),
        { lat: 0, lng: 0 },
      );

      centroid.lat /= remaining.length;
      centroid.lng /= remaining.length;

      remaining.sort((a, b) => {
        const distA = Math.hypot(
          a.location.lat - centroid.lat,
          a.location.lng - centroid.lng,
        );
        const distB = Math.hypot(
          b.location.lat - centroid.lat,
          b.location.lng - centroid.lng,
        );
        return distA - distB;
      });

      const ordered: ActivityModel[] = [];
      let current = remaining.shift();

      while (current) {
        ordered.push(current);

        if (remaining.length === 0) {
          break;
        }

        let nextIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;

        remaining.forEach((candidate, index) => {
          const candidateDistance = getDistanceMiles(current, candidate);
          if (candidateDistance < bestDistance) {
            bestDistance = candidateDistance;
            nextIndex = index;
          }
        });

        current = remaining.splice(nextIndex, 1)[0];
      }

      let clock = 9 * 60;
      let totalActivityMinutes = 0;
      let totalTravelMinutes = 0;
      let totalEstimatedCost = 0;

      const stops: GeneratedItineraryStop[] = ordered.map((place, index) => {
        const durationMins = Math.max(
          45,
          Math.min(place.typicalDurationMins || 90, 180),
        );
        const travelDistanceMiles =
          index === 0 ? 0 : getDistanceMiles(ordered[index - 1], place);
        const travelTimeMins =
          index === 0
            ? 0
            : Math.max(10, Math.round((travelDistanceMiles / 18) * 60));

        clock += travelTimeMins;
        const startTime = formatClock(clock);
        clock += durationMins;
        const endTime = formatClock(clock);

        totalTravelMinutes += travelTimeMins;
        totalActivityMinutes += durationMins;
        totalEstimatedCost += getAveragePrice(place);

        return {
          order: index + 1,
          placeId: place.id,
          startTime,
          endTime,
          travelTimeMinsFromPrevious: travelTimeMins,
          travelDistanceMilesFromPrevious:
            Math.round(travelDistanceMiles * 10) / 10,
          durationMins,
        };
      });

      return {
        title: "Your Day Plan",
        dateLabel: "Today",
        startTime: stops[0]?.startTime ?? "9:00 AM",
        endTime: stops[stops.length - 1]?.endTime ?? "5:00 PM",
        totalStops: ordered.length,
        totalActivityMinutes,
        totalTravelMinutes,
        totalEstimatedCost,
        stops,
      };
    },
    [],
  );

  const persistItineraryState = useCallback(
    (selection: ActivityModel[], itinerary: GeneratedItinerary | null) => {
      void saveToFirestore(savedPlaces, selection, itinerary);
    },
    [savedPlaces, itineraryPlaces, generatedItinerary],
  );

  useEffect(() => {
    if (itineraryPlaces.length >= 5 && !generatedItinerary) {
      const nextGenerated = buildGeneratedItinerary(itineraryPlaces);
      setGeneratedItinerary(nextGenerated);
      persistItineraryState(itineraryPlaces, nextGenerated);
    }

    if (itineraryPlaces.length < 5 && generatedItinerary) {
      setGeneratedItinerary(null);
      persistItineraryState(itineraryPlaces, null);
    }
  }, [
    buildGeneratedItinerary,
    generatedItinerary,
    itineraryPlaces,
    persistItineraryState,
  ]);

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
      const nextGenerated = buildGeneratedItinerary(updatedSelection);

      setItineraryPlaces(updatedSelection);
      setGeneratedItinerary(nextGenerated);
      void saveToFirestore(updated, updatedSelection, nextGenerated);
      return updated;
    });
  };

  // itinerary logic
  const addToItinerary = (place: ActivityModel) => {
    setItineraryPlaces((prev) => {
      if (prev.some((p) => p.id === place.id)) return prev;
      const updated = [...prev, place];
      const nextGenerated = buildGeneratedItinerary(updated);
      setGeneratedItinerary(nextGenerated);
      persistItineraryState(updated, nextGenerated);
      return updated;
    });
  };

  const removeFromItinerary = (placeId: string) => {
    setItineraryPlaces((prev) => {
      const updated = prev.filter((p) => p.id !== placeId);
      const nextGenerated = buildGeneratedItinerary(updated);
      setGeneratedItinerary(nextGenerated);
      persistItineraryState(updated, nextGenerated);
      return updated;
    });
  };

  const generateItinerary = useCallback(() => {
    const nextGenerated = buildGeneratedItinerary(itineraryPlaces);
    setGeneratedItinerary(nextGenerated);
    persistItineraryState(itineraryPlaces, nextGenerated);
  }, [buildGeneratedItinerary, itineraryPlaces, persistItineraryState]);

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

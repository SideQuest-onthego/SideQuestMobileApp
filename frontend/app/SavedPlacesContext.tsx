import React, { createContext, useContext, useState, ReactNode } from "react";
import type { ActivityModel } from "../types/sidequest-models";

// Defines what values the context will provide
type SavedPlacesContextType = {
  savedPlaces: ActivityModel[];
  savePlace: (place: ActivityModel) => void;
};
// Create the context (initially undefined)
const SavedPlacesContext = createContext<SavedPlacesContextType | undefined>(undefined);

// Provider component that wraps the app and gives access to saved places
export const SavedPlacesProvider = ({ children }: { children: ReactNode }) => {
  // State to store all saved places
  const [savedPlaces, setSavedPlaces] = useState<ActivityModel[]>([]);

  // Function to add a place to saved list (avoids duplicates)
  const savePlace = (place: ActivityModel) => {
    setSavedPlaces((prev) => {
      // Check if place already exists by id
      if (!prev.find((p) => p.id === place.id)) {
        return [...prev, place]; // Add new place
      }
      return prev;
    });
  };

  // Provide state + function to entire app
  return (
    <SavedPlacesContext.Provider value={{ savedPlaces, savePlace }}>
      {children}
    </SavedPlacesContext.Provider>
  );
};
// Custom hook to use the context safely
export const useSavedPlaces = () => {
  const context = useContext(SavedPlacesContext);
  // Error if used outside provider
  if (!context) {
    throw new Error("useSavedPlaces must be used within a SavedPlacesProvider");
  }
  return context;
};
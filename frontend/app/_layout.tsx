import { Stack } from "expo-router";
import React from "react";
import { SavedPlacesProvider } from "./SavedPlacesContext";


// Root layout wraps entire app
export default function RootLayout() {
  return (
    // Wrap whole navigation system with SavedPlacesProvider
    <SavedPlacesProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SavedPlacesProvider>
  );
}
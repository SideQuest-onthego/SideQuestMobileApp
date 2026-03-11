// frontend/app/swipe.tsx

// Import React and hooks used for state, effects, and memoization
import React, { useEffect, useMemo, useState } from "react";

// Import Expo Router hook used to read parameters passed through navigation
import { useLocalSearchParams } from "expo-router";

// Import React Native UI components
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

// Import the custom swipe card deck component
import SwipeDeck from "../components/SwipeDeck";

// Import function that retrieves nearby places from the Google Places service
import { fetchNearbyManhattanPlaces } from "../services/googlePlaces";

// Import the type definition for activity/place objects
import type { ActivityModel } from "../types/sidequest-models";

// Import the saved places context hook so places can be stored globally
import { useSavedPlaces } from "../app/SavedPlacesContext";


// Main screen component for the swipe feature
export default function SwipeScreen() {

  // Read query parameters passed through the router (ex: budget from previous screen)
  const { budget } = useLocalSearchParams();

  // Convert the budget parameter to a number
  const numericBudget = Number(budget);

  // State to store the list of places retrieved from the API
  const [data, setData] = useState<ActivityModel[]>([]);

  // State to track whether data is still loading
  const [loading, setLoading] = useState(true);

  // State to store any error message that may occur while loading data
  const [error, setError] = useState<string | null>(null);

  // Access functions and data from the SavedPlaces context
  const { addPlace, savedPlaces } = useSavedPlaces();


  // --------------------------------------------------------
  // Fetch nearby places when the screen first loads
  // --------------------------------------------------------
  useEffect(() => {

    // Track whether the component is still mounted
    // Prevents state updates if the user leaves the screen early
    let mounted = true;

    // Async function to load places from Google Places API
    const loadPlaces = async () => {
      try {

        // Fetch nearby Manhattan places
        const places = await fetchNearbyManhattanPlaces();

        // If component was unmounted, stop execution
        if (!mounted) return;

        // Store the retrieved places in state
        setData(places);

      } catch (e) {

        // If component was unmounted, stop execution
        if (!mounted) return;

        // Save error message if fetching fails
        setError(e instanceof Error ? e.message : "Failed to load places");

      } finally {

        // Stop loading indicator once request finishes
        if (mounted) setLoading(false);
      }
    };

    // Call the function to load places
    loadPlaces();

    // Cleanup function runs if the component unmounts
    return () => { mounted = false; };

  }, []); // Runs only once when component first mounts


  // --------------------------------------------------------
  // Determine the effective budget for filtering places
  // --------------------------------------------------------
  const effectiveBudget =
    Number.isFinite(numericBudget) && numericBudget > 0
      ? numericBudget // Use user provided budget if valid
      : Number.POSITIVE_INFINITY; // Otherwise allow unlimited budget


  // --------------------------------------------------------
  // Filter places based on the user's budget
  // --------------------------------------------------------
  const filteredPlaces = useMemo(

    // Only include places whose minimum estimated cost
    // is within the allowed budget
    () => data.filter(place => place.estimatedCost.min <= effectiveBudget),

    // Recalculate only if data or budget changes
    [data, effectiveBudget]
  );


  // --------------------------------------------------------
  // Render the swipe screen UI
  // --------------------------------------------------------
  return (

    // Main container view
    <View style={{ flex: 1 }}>

      {/* If data is still loading, show loading spinner */}
      {loading ? (

        <View style={styles.centered}>

          {/* Spinner animation */}
          <ActivityIndicator size="large" />

          {/* Loading message */}
          <Text style={styles.loadingText}>
            Loading places for your budget...
          </Text>

        </View>

      ) : (

        <>
          {/* Show error message if something went wrong */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Swipe deck component that displays cards for each place */}
          <SwipeDeck

            // Pass filtered places to the swipe deck
            data={filteredPlaces}

            // When the user swipes right (likes a place)
            onSwipeRight={(place) => {

              // Only add the place if it hasn't already been saved
              if (!savedPlaces.some(p => p.id === place.id)) {
                addPlace(place);
              }

            }}
          />
        </>
      )}

    </View>
  );
}


// --------------------------------------------------------
// Styles used for the screen
// --------------------------------------------------------
const styles = StyleSheet.create({

  // Centered layout used while loading
  centered: {
    flex: 1,
    alignItems: "center",   // center horizontally
    justifyContent: "center", // center vertically
    gap: 10,                // space between elements
    paddingHorizontal: 16,
  },

  // Text style for loading message
  loadingText: {
    fontSize: 14,
  },

  // Text style for error messages
  errorText: {
    textAlign: "center",
    color: "#8A1C1C", // dark red
    fontSize: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
  },

});
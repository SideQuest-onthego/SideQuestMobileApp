import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import SwipeDeck from "../components/SwipeDeck";
import { places } from "../data/places";
import { fetchNearbyManhattanPlaces } from "../services/googlePlaces";
import type { ActivityModel } from "../types/sidequest-models";

//Returns the minimum estimated cost of a place
//So a range like 17-30 would return 17
function getPlaceCost(place: ActivityModel): number {
  return place.estimatedCost?.min ?? 0;
}

export default function SwipeScreen() {
  const [data, setData] = useState<ActivityModel[]>(places);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPlaces() {
      try {
        const livePlaces = await fetchNearbyManhattanPlaces();
        if (!mounted) return;
        if (livePlaces.length > 0) {
          setData(livePlaces);
        }
      } catch (e) {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : "Failed to load places";
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPlaces();
    return () => {
      mounted = false;
    };
  }, []);

  //Read the budget from the router parameters
  const { budget } = useLocalSearchParams();
  //Convert the budget to a number (0 if it's missing or invalid)
  const numericBudget = Number(budget) || 0;
  //Filter the places to only include those that are within the user's budget
  //Starting from the minimum cost of the place
  const filteredPlaces = data.filter(
    (place) => getPlaceCost(place) <= numericBudget,
  );

  //Render the SwipeDeck using only the filtered list of places
  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading places for your budget...</Text>
        </View>
      ) : (
        <>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <SwipeDeck data={filteredPlaces} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  errorText: {
    textAlign: "center",
    color: "#8A1C1C",
    fontSize: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
});

import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import SwipeDeck from "../components/SwipeDeck";
import { places } from "../data/places";
import { fetchNearbyManhattanPlaces } from "../services/googlePlaces";
import type { ActivityModel } from "../types/sidequest-models";

export default function SwipeScreen() {
  const { budget } = useLocalSearchParams();
  const numericBudget = Number(budget);
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

  const effectiveBudget = Number.isFinite(numericBudget) && numericBudget > 0
    ? numericBudget
    : Number.POSITIVE_INFINITY;

  const filteredPlaces = useMemo(
    () => data.filter((place) => place.estimatedCost.min <= effectiveBudget),
    [data, effectiveBudget]
  );

  return (
    <View style={{ flex: 1 }}>
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

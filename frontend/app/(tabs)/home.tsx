import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import SwipeDeck from "../../components/SwipeDeck";
import { places } from "../../data/places";
import type { ActivityModel } from "../../types/sidequest-models";
import { fetchNearbyManhattanPlaces } from "../../services/googlePlaces";

// HOME TAB PAGE

export default function HomeScreen() {
  const [data, setData] = useState<ActivityModel[]>(places);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPlaces() {
      try {
        const livePlaces = await fetchNearbyManhattanPlaces(); // Placeholder function name to indicidate hard coded
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

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading nearby Manhattan places...</Text>
        </View>
      ) : (
        <>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <SwipeDeck data={data} />
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

import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import SwipeDeck from "../components/SwipeDeck";
import { places } from "../data/places";
import { fetchNearbyManhattanPlacesPage } from "../services/googlePlaces";
import {
  DEFAULT_PREFERENCES,
  loadUserSearchPreferences,
} from "../services/userPreferences";
import { rankPlacesByPreferences } from "../services/placeRanking";
import type { ActivityModel } from "../types/sidequest-models";

const MILES_TO_METERS = 1609.34;

export default function SwipeScreen() {
  const [data, setData] = useState<ActivityModel[]>(places);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferredDistance, setPreferredDistance] = useState(
    DEFAULT_PREFERENCES.distance,
  );
  const [preferredBudget, setPreferredBudget] = useState(
    DEFAULT_PREFERENCES.budget,
  );
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadRecommendations() {
      setLoading(true);
      const preferences = await loadUserSearchPreferences();
      const distanceMiles = preferences.distance;

      if (mounted) {
        setPreferredDistance(distanceMiles);
        setPreferredBudget(preferences.budget);
      }

      try {
        const firstPage = await fetchNearbyManhattanPlacesPage(
          distanceMiles * MILES_TO_METERS,
          0,
        );

        if (!mounted) {
          return;
        }

        if (firstPage.places.length > 0) {
          setData(rankPlacesByPreferences(firstPage.places, preferences));
          setNextCursor(firstPage.nextCursor);
          setError(null);
        } else {
          setData(rankPlacesByPreferences(places, preferences));
          setNextCursor(null);
          setError(
            "No live places matched your distance and budget, so showing the closest available recommendations.",
          );
        }
      } catch (e) {
        if (!mounted) {
          return;
        }

        const message =
          e instanceof Error ? e.message : "Failed to load places";
        setError(message);
        setData(rankPlacesByPreferences(places, preferences));
        setNextCursor(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadRecommendations();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLoadMore() {
    if (loading || isLoadingMore || nextCursor === null) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const preferences = await loadUserSearchPreferences();
      const page = await fetchNearbyManhattanPlacesPage(
        preferences.distance * MILES_TO_METERS,
        nextCursor,
      );

      setData((prev) => {
        const merged = new Map(prev.map((place) => [place.id, place]));
        for (const place of page.places) {
          merged.set(place.id, place);
        }
        return rankPlacesByPreferences(Array.from(merged.values()), preferences);
      });
      setNextCursor(page.nextCursor);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load more places";
      setError(message);
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            Loading places within {preferredDistance} miles and under $
            {preferredBudget}...
          </Text>
        </View>
        ) : (
        <>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <SwipeDeck
            data={data}
            onNearEnd={handleLoadMore}
            hasMore={nextCursor !== null}
            isLoadingMore={isLoadingMore}
          />
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
    textAlign: "center",
  },
  errorText: {
    textAlign: "center",
    color: "#8A1C1C",
    fontSize: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
});

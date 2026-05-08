import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import SwipeDeck from "../../components/SwipeDeck";
import { useLocation } from "../../context/LocationContext";
import { places } from "../../data/places";
import type { ActivityModel } from "../../types/sidequest-models";
import { fetchNearbyPlacesPage } from "../../services/googlePlaces";
import {
  DEFAULT_PREFERENCES,
  loadUserSearchPreferences,
} from "../../services/userPreferences";
import { rankPlacesByPreferences } from "../../services/placeRanking";

const MILES_TO_METERS = 1609.34;

// HOME TAB PAGE

export default function HomeScreen() {
  const { userLocation, radiusMiles } = useLocation();
  const [data, setData] = useState<ActivityModel[]>(places);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadPlaces() {
      setLoading(true);
      setError(null);
      setNextCursor(0);
      try {
        const preferences = await loadUserSearchPreferences();
        const searchCenter = userLocation
          ? {
              lat: userLocation.latitude,
              lng: userLocation.longitude,
            }
          : {
              lat: 40.7831,
              lng: -73.9712,
            };
        const firstPage = await fetchNearbyPlacesPage(
          searchCenter,
          radiusMiles * MILES_TO_METERS,
          0,
        );
        if (!mounted) return;
        if (firstPage.places.length > 0) {
          setData(rankPlacesByPreferences(firstPage.places, preferences));
          setNextCursor(firstPage.nextCursor);
        } else {
          setData(rankPlacesByPreferences(places, preferences));
          setNextCursor(null);
          setError(
            userLocation
              ? "No live places matched this location and distance, so showing fallback recommendations."
              : "No live places matched the default area, so showing fallback recommendations.",
          );
        }
      } catch (e) {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : "Failed to load places";
        setError(message);
        setData(rankPlacesByPreferences(places, DEFAULT_PREFERENCES));
        setNextCursor(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPlaces();
    return () => {
      mounted = false;
    };
  }, [radiusMiles, userLocation]);

  async function handleLoadMore() {
    if (loading || isLoadingMore || nextCursor === null) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const preferences = await loadUserSearchPreferences();
      const searchCenter = userLocation
        ? {
            lat: userLocation.latitude,
            lng: userLocation.longitude,
          }
        : {
            lat: 40.7831,
            lng: -73.9712,
          };
      const page = await fetchNearbyPlacesPage(
        searchCenter,
        radiusMiles * MILES_TO_METERS,
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
            {userLocation
              ? `Loading places within ${radiusMiles} miles of your selected location...`
              : "Loading places near the default area..."}
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
  },
  errorText: {
    textAlign: "center",
    color: "#8A1C1C",
    fontSize: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
});

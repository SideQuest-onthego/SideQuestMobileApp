import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import SwipeDeck from "../../components/SwipeDeck";
import { useLocation } from "../../context/LocationContext";
import type { ActivityModel } from "../../types/sidequest-models";
import { fetchNearbyPlacesPage } from "../../services/googlePlaces";
import {
  DEFAULT_PREFERENCES,
  subscribeToUserSearchPreferences,
} from "../../services/userPreferences";
import { rankPlacesByPreferences } from "../../services/placeRanking";

const MILES_TO_METERS = 1609.34;
const SEEN_PLACES_STORAGE_KEY = "sidequest.seenPlaceIds";
const MAX_SEEN_PLACE_IDS = 300;

function createShuffleSeed() {
  return Math.floor(Math.random() * 1_000_000_000);
}

function getSeededScore(seed: number, id: string) {
  let hash = seed;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }

  return hash >>> 0;
}

function shufflePlacesForSession(places: ActivityModel[], seed: number) {
  return [...places].sort(
    (a, b) => getSeededScore(seed, a.id) - getSeededScore(seed, b.id),
  );
}

function getUnseenPlaces(
  places: ActivityModel[],
  seenPlaceIds: ReadonlySet<string>,
  fallbackToAll = true,
) {
  const unseenPlaces = places.filter((place) => !seenPlaceIds.has(place.id));
  return unseenPlaces.length > 0 || !fallbackToAll ? unseenPlaces : places;
}

function parseSeenPlaceIds(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

// HOME TAB PAGE

export default function HomeScreen() {
  const { userLocation, radiusMiles } = useLocation();
  const [data, setData] = useState<ActivityModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [deckSeed] = useState(createShuffleSeed);
  const [seenPlaceIds, setSeenPlaceIds] = useState<string[]>([]);
  const [hasLoadedSeenPlaces, setHasLoadedSeenPlaces] = useState(false);
  const seenPlaceIdsRef = useRef(new Set<string>());

  useEffect(() => {
    return subscribeToUserSearchPreferences((nextPreferences) => {
      setPreferences(nextPreferences);
      setHasLoadedPreferences(true);
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(SEEN_PLACES_STORAGE_KEY)
      .then((value) => {
        if (!mounted) {
          return;
        }

        setSeenPlaceIds(parseSeenPlaceIds(value));
      })
      .catch((error) => {
        console.warn("Failed to load seen places:", error);
      })
      .finally(() => {
        if (mounted) {
          setHasLoadedSeenPlaces(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    seenPlaceIdsRef.current = new Set(seenPlaceIds);
  }, [seenPlaceIds]);

  const markPlaceSeen = useCallback((place: ActivityModel) => {
    setSeenPlaceIds((previousIds) => {
      if (previousIds.includes(place.id)) {
        return previousIds;
      }

      const nextIds = [place.id, ...previousIds].slice(0, MAX_SEEN_PLACE_IDS);
      seenPlaceIdsRef.current = new Set(nextIds);
      AsyncStorage.setItem(SEEN_PLACES_STORAGE_KEY, JSON.stringify(nextIds)).catch(
        (error) => {
          console.warn("Failed to save seen place:", error);
        },
      );

      return nextIds;
    });
  }, []);

  useEffect(() => {
    if (!hasLoadedPreferences || !hasLoadedSeenPlaces) {
      return;
    }

    let mounted = true;

    async function loadPlaces() {
      setLoading(true);
      setError(null);
      setNextCursor(0);
      try {
        const searchPreferences = {
          ...preferences,
          distance: radiusMiles,
        };
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
          { forceRefresh: true },
        );
        if (!mounted) return;
        if (firstPage.places.length > 0) {
          const rankedPlaces = rankPlacesByPreferences(
            firstPage.places,
            searchPreferences,
          );
          const unseenPlaces = getUnseenPlaces(
            rankedPlaces,
            seenPlaceIdsRef.current,
          );
          setData(shufflePlacesForSession(unseenPlaces, deckSeed));
          setNextCursor(firstPage.nextCursor);
        } else {
          setData([]);
          setNextCursor(null);
          setError(
            userLocation
              ? "No Google Places matched this location and distance."
              : "No Google Places matched the default area.",
          );
        }
      } catch (e) {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : "Failed to load places";
        setError(message);
        setData([]);
        setNextCursor(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPlaces();
    return () => {
      mounted = false;
    };
  }, [
    deckSeed,
    hasLoadedPreferences,
    hasLoadedSeenPlaces,
    preferences,
    radiusMiles,
    userLocation,
  ]);

  async function handleLoadMore() {
    if (loading || isLoadingMore || nextCursor === null) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const searchPreferences = {
        ...preferences,
        distance: radiusMiles,
      };
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
        const rankedPagePlaces = rankPlacesByPreferences(
          page.places,
          searchPreferences,
        );
        const unseenPlaces = getUnseenPlaces(
          rankedPagePlaces,
          seenPlaceIdsRef.current,
          false,
        );

        for (const place of unseenPlaces) {
          merged.set(place.id, place);
        }
        return rankPlacesByPreferences(
          Array.from(merged.values()),
          searchPreferences,
        );
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
            onSwipeLeft={markPlaceSeen}
            onSwipeRight={markPlaceSeen}
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

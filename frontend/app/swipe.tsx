import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../FirebaseConfig";
import SwipeDeck from "../components/SwipeDeck";
import { places } from "../data/places";
import { fetchNearbyManhattanPlaces } from "../services/googlePlaces";
import type { ActivityModel } from "../types/sidequest-models";

const DEFAULT_DISTANCE_MILES = 10;
const MILES_TO_METERS = 1609.34;
const MANHATTAN_ORIGIN = { lat: 40.712778, lng: -74.006111 };

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceMiles(place: ActivityModel): number {
  const lat1 = toRadians(MANHATTAN_ORIGIN.lat);
  const lon1 = toRadians(MANHATTAN_ORIGIN.lng);
  const lat2 = toRadians(place.location.lat);
  const lon2 = toRadians(place.location.lng);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadiusMiles = 3958.8;

  return earthRadiusMiles * c;
}

export default function SwipeScreen() {
  const [data, setData] = useState<ActivityModel[]>(places);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferredDistance, setPreferredDistance] = useState(
    DEFAULT_DISTANCE_MILES,
  );

  useEffect(() => {
    let mounted = true;

    async function loadRecommendations() {
      setLoading(true);

      let distanceMiles = DEFAULT_DISTANCE_MILES;

      if (auth.currentUser) {
        try {
          const snapshot = await getDoc(
            doc(db, "userPreferences", auth.currentUser.uid),
          );

          if (
            snapshot.exists() &&
            typeof snapshot.data().distance === "number" &&
            snapshot.data().distance > 0
          ) {
            distanceMiles = snapshot.data().distance;
          }
        } catch (e) {
          if (mounted) {
            const message =
              e instanceof Error ? e.message : "Failed to load preferences";
            setError(message);
          }
        }
      }

      if (mounted) {
        setPreferredDistance(distanceMiles);
      }

      try {
        const livePlaces = await fetchNearbyManhattanPlaces(
          distanceMiles * MILES_TO_METERS,
        );

        if (!mounted) {
          return;
        }

        if (livePlaces.length > 0) {
          setData(livePlaces);
          setError(null);
        } else {
          setData(places);
          setError(
            "No live places matched that distance, so showing fallback recommendations.",
          );
        }
      } catch (e) {
        if (!mounted) {
          return;
        }

        const message =
          e instanceof Error ? e.message : "Failed to load places";
        setError(message);
        setData(places);
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

  const rankedPlaces = useMemo(() => {
    return [...data]
      .filter((place) => getDistanceMiles(place) <= preferredDistance)
      .sort((a, b) => getDistanceMiles(a) - getDistanceMiles(b));
  }, [data, preferredDistance]);

  const displayedPlaces = rankedPlaces.length > 0 ? rankedPlaces : data;

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            Loading places within {preferredDistance} miles of Manhattan...
          </Text>
        </View>
      ) : (
        <>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <SwipeDeck data={displayedPlaces} />
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

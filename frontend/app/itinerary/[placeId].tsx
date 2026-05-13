import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSavedPlaces } from "@/context/SavedPlacesContext";
import { formatCategoryLabel } from "@/services/placeDisplay";
import {
  fetchPlaceInsights,
  type PlaceInsights,
} from "@/services/geminiPlaceInsights";

// ITINERARY PAGE PER PLACE

// normalize pricing (using saved data from POI)
function formatPrice(min: number, max: number) {
  if (min === 0 && max === 0) {
    return "Free";
  }

  if (min === max) {
    return `$${max}`;
  }

  return `$${min}-$${max}`;
}

export default function ItineraryDetailScreen() {
  const router = useRouter();
  const { placeId } = useLocalSearchParams<{ placeId?: string }>(); // grabs placeId from POI
  const { savedPlaces } = useSavedPlaces();

  const selectedPlace = useMemo(
    // useMemo function to cache results, avoid API call
    () => savedPlaces.find((place) => place.id === placeId) ?? null, // returns POI info via placeId
    [placeId, savedPlaces],
  );

  const [insights, setInsights] = useState<PlaceInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(false);

  // Fire Gemini insights request only after the user opens this place.
  useEffect(() => {
    if (!selectedPlace) return;

    let cancelled = false;
    setInsights(null);
    setInsightsError(false);
    setInsightsLoading(true);

    fetchPlaceInsights(selectedPlace)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setInsights(result);
        } else {
          setInsightsError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setInsightsError(true);
      })
      .finally(() => {
        if (!cancelled) setInsightsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPlace?.id]);

  if (!selectedPlace) {
    // if doesn't exist or function can't find POI
    return (
      <View style={styles.emptyState}>
        <Pressable style={styles.emptyBackButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to Saved</Text>
        </Pressable>
        <Text style={styles.emptyTitle}>Saved place not found</Text>
        <Text style={styles.emptyText}>
          This itinerary page is keyed by the saved POI id, but that place could
          not be loaded from your saved list.
        </Text>
      </View>
    );
  }

  // BEFORE YOU CONTINUE:
  /**
   * selectedPlace = the POI that we are specifically looking at right now
   * All Styling is local and at bottom of screen, please feel free to normalize frontend team
   * try to reference components using typescript interface (/(types)/sidequest-model.ts)
   */
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back to Saved</Text>
      </Pressable>

      <Text style={styles.eyebrow}>Saved Place</Text>

      <View style={styles.heroCard}>
        {selectedPlace.links?.imageUrl ? (
          <Image
            source={{ uri: selectedPlace.links.imageUrl }} // normalized format from ts file
            style={styles.heroImage}
          />
        ) : (
          <View style={[styles.heroImage, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>POI</Text>
          </View>
        )}

        <View style={styles.heroCopy}>
          <Text style={styles.title}>{selectedPlace.name}</Text>
          <Text style={styles.address}>
            {selectedPlace.location.address}, {selectedPlace.location.city},{" "}
            {selectedPlace.location.state}
          </Text>
          <Text style={styles.meta}>
            {formatCategoryLabel(selectedPlace.category, selectedPlace.type)} •{" "}
            {formatPrice(
              selectedPlace.estimatedCost.min,
              selectedPlace.estimatedCost.max,
            )}
          </Text>
        </View>
      </View>

      <View style={styles.insightsCard}>
        <View style={styles.insightsHeader}>
          <View style={styles.insightsHeaderIcon}>
            <Ionicons name="sparkles" size={18} color="#1F5C4A" />
          </View>
          <Text style={styles.insightsTitle}>Gemini Insights</Text>
        </View>

        {insightsLoading && (
          <View style={styles.insightsStatus}>
            <ActivityIndicator size="small" color="#1F5C4A" />
            <Text style={styles.insightsStatusText}>
              Generating insights for {selectedPlace.name}…
            </Text>
          </View>
        )}

        {!insightsLoading && insightsError && (
          <Text style={styles.insightsStatusText}>
            Insights are unavailable for this place right now.
          </Text>
        )}

        {!insightsLoading && !insightsError && insights && (
          <>
            <Text style={styles.insightsSummary}>{insights.summary}</Text>

            <View style={styles.insightsList}>
              <InsightsRow
                icon="time-outline"
                title="Best Time to Visit"
                description={insights.bestTimeToVisit}
              />
              <InsightsRow
                icon="leaf-outline"
                title="Good For"
                description={insights.goodFor.join(", ")}
              />
              <InsightsRow
                icon="location-outline"
                title="Nearby Suggestions"
                description={insights.nearbySuggestions.join(", ")}
              />
              <InsightsRow
                icon="heart-outline"
                title="Vibe"
                description={insights.vibe.join(", ")}
                isLast
              />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

type InsightsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  isLast?: boolean;
};

function InsightsRow({ icon, title, description, isLast }: InsightsRowProps) {
  return (
    <View style={[styles.insightsRow, isLast && styles.insightsRowLast]}>
      <View style={styles.insightsRowIcon}>
        <Ionicons name={icon} size={18} color="#1F5C4A" />
      </View>
      <View style={styles.insightsRowCopy}>
        <Text style={styles.insightsRowTitle}>{title}</Text>
        <Text style={styles.insightsRowDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#7CA59B" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DBFEF7",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 60,
    paddingBottom: 120,
    gap: 16,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#111",
    borderRadius: 999,
  },
  emptyBackButton: {
    position: "absolute",
    top: 60,
    left: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#111",
    borderRadius: 999,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  eyebrow: {
    width: "98%",
    alignSelf: "center",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#46655F",
  },
  heroCard: {
    width: "98%",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#000000",
    padding: 16,
    gap: 14,
  },
  heroImage: {
    width: "100%",
    height: 220,
    borderRadius: 28,
  },
  imageFallback: {
    backgroundColor: "#C8DDD8",
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#34524C",
  },
  heroCopy: {
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#102C26",
  },
  address: {
    fontSize: 15,
    color: "#34524C",
    lineHeight: 22,
  },
  meta: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4D6D66",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#B7CFC8",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102C26",
  },
  sectionText: {
    fontSize: 15,
    color: "#27443E",
    lineHeight: 22,
  },
  insightsCard: {
    width: "98%",
    alignSelf: "center",
    backgroundColor: "#EAF7F0",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#C8E2D5",
    padding: 18,
    gap: 14,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  insightsHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102C26",
    flex: 1,
  },
  insightsSummary: {
    fontSize: 15,
    lineHeight: 22,
    color: "#27443E",
  },
  insightsStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  insightsStatusText: {
    fontSize: 14,
    color: "#46655F",
  },
  insightsList: {
    marginTop: 2,
  },
  insightsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C8E2D5",
  },
  insightsRowLast: {
    borderBottomWidth: 0,
  },
  insightsRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#CDE9D9",
    alignItems: "center",
    justifyContent: "center",
  },
  insightsRowCopy: {
    flex: 1,
    gap: 2,
  },
  insightsRowTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#102C26",
  },
  insightsRowDescription: {
    fontSize: 14,
    color: "#34524C",
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#DBFEF7",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#102C26",
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#34524C",
  },
});

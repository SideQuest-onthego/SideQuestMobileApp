import { IconSymbol } from "@/components/ui/icon-symbol";
import { Ionicons } from "@expo/vector-icons";
import { useSavedPlaces } from "@/context/SavedPlacesContext";
import {
  //generateItineraryWithGemini,
  type GeneratedItinerary,
  type ItineraryStop,
} from "@/services/geminiItinerary";
import { useRouter } from "expo-router";
import React, { useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function formatPrice(min: number, max: number) {
  if (min === 0 && max === 0) {
    return "Free";
  }

  if (min === max) {
    return `$${max}`;
  }

  return `$${min}-$${max}`;
}

function getAveragePrice(min: number, max: number) {
  if (min === 0 && max === 0) {
    return 0;
  }

  if (min === max) {
    return max;
  }

  return Math.round((min + max) / 2);
}

function formatLocation(city?: string, state?: string) {
  if (city && state) {
    return `${city}, ${state}`;
  }

  if (city) {
    return city;
  }

  if (state) {
    return state;
  }

  return "Location unavailable";
}

export default function ItineraryScreen() {
  const router = useRouter();
  const { itineraryPlaces, removeFromItinerary } = useSavedPlaces();
  const [generatedItinerary, setGeneratedItinerary] =
    useState<GeneratedItinerary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const itineraryStops = useMemo((): ItineraryStop[] => {
    if (generatedItinerary) {
      return generatedItinerary.stops;
    }
    return itineraryPlaces.slice(0, 5).map((place, index) => ({
      place,
      order: index + 1,
      startTime:
        ["10:00 AM", "12:00 PM", "2:00 PM", "4:30 PM", "6:00 PM"][index] ??
        "TBD",
      endTime:
        ["11:30 AM", "1:30 PM", "3:30 PM", "6:00 PM", "7:30 PM"][index] ??
        "TBD",
    }));
  }, [itineraryPlaces, generatedItinerary]);

  const totalEstimatedCost = useMemo(() => {
    return itineraryStops.reduce((total, stop) => {
      return (
        total +
        getAveragePrice(
          stop.place.estimatedCost.min,
          stop.place.estimatedCost.max,
        )
      );
    }, 0);
  }, [itineraryStops]);

  const totalDurationMins = useMemo(() => {
    return generatedItinerary?.totalDurationMins ?? itineraryStops.length * 90;
  }, [generatedItinerary, itineraryStops]);

  const handleRemoveStop = (placeId: string) => {
    removeFromItinerary(placeId);
  };

  const handleGenerateRoute = useCallback(async () => {
    if (itineraryPlaces.length === 0) return;

    setIsGenerating(true);
    try {
      const result = await generateItineraryWithGemini(
        itineraryPlaces.slice(0, 5),
        "10:00 AM",
      );
      setGeneratedItinerary(result);
    } catch (error) {
      console.error("Failed to generate itinerary:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [itineraryPlaces]);

  if (itineraryStops.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No itinerary yet</Text>
        <Text style={styles.emptyText}>
          Save a few places first and they will appear here as your day plan.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Itinerary</Text>
      </View>

      <View style={styles.segmentRow}>
        <Pressable style={[styles.segmentButton, styles.segmentButtonActive]}>
          <Text style={[styles.segmentText, styles.segmentTextActive]}>
            Today
          </Text>
        </Pressable>

        <Pressable style={styles.segmentButton}>
          <Text style={styles.segmentText}>Tomorrow</Text>
        </Pressable>

        <Pressable style={styles.segmentButton}>
          <Text style={styles.segmentText}>Custom</Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIconBox}>
          <IconSymbol size={28} name="map" color="#102C26" />
        </View>

        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>Your Day Plan</Text>

          <View style={styles.summaryMetaRow}>
            <Text style={styles.summaryMetaText}>
              {itineraryStops.length} stops
            </Text>
            <Text style={styles.summaryMetaDot}>•</Text>
            <Text style={styles.summaryMetaText}>
              ~{Math.round(totalDurationMins / 60)} hrs
            </Text>
            <Text style={styles.summaryMetaDot}>•</Text>
            <Text style={styles.summaryMetaText}>
              Est. ${totalEstimatedCost}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.stopsHeader}>
        <View style={styles.stopsHeaderLeft}>
          <IconSymbol size={18} name="list.bullet" color="#102C26" />
          <Text style={styles.stopsTitle}>Your Stops</Text>
        </View>
      </View>

      <View style={styles.timelineWrapper}>
        <View style={styles.timelineRail} />

        {itineraryStops.map((stop) => {
          const priceLabel = formatPrice(
            stop.place.estimatedCost.min,
            stop.place.estimatedCost.max,
          );

          return (
            <View key={stop.place.id} style={styles.stopRow}>
              <View style={styles.markerColumn}>
                <View style={styles.timelineMarker}>
                  <Text style={styles.timelineMarkerText}>{stop.order}</Text>
                </View>
              </View>

              <Pressable
                style={styles.stopCard}
                onPress={() =>
                  router.push({
                    pathname: "/itinerary/[placeId]",
                    params: { placeId: stop.place.id },
                  })
                }
              >
                {stop.place.links?.imageUrl ? (
                  <Image
                    source={{ uri: stop.place.links.imageUrl }}
                    style={styles.stopImage}
                  />
                ) : (
                  <View style={[styles.stopImage, styles.imageFallback]}>
                    <Text style={styles.imageFallbackText}>POI</Text>
                  </View>
                )}

                <View style={styles.stopContent}>
                  <View style={styles.stopTopRow}>
                    <View style={styles.timeRow}>
                      <IconSymbol size={14} name="clock" color="#8B8B8B" />
                      <Text style={styles.timeText}>{stop.startTime}</Text>
                    </View>

                    <View style={styles.stopActionsRow}>
                      <Text style={styles.priceText}>{priceLabel}</Text>

                      <Pressable
                        style={styles.deleteButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          handleRemoveStop(stop.place.id);
                        }}
                      >
                        <Ionicons size={16} name="trash" color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>

                  <Text style={styles.stopTitle} numberOfLines={2}>
                    {stop.place.name}
                  </Text>

                  <Text style={styles.stopAddress} numberOfLines={1}>
                    {formatLocation(
                      stop.place.location.city,
                      stop.place.location.state,
                    )}
                  </Text>

                  <View style={styles.chipRow}>
                    <View
                      style={[
                        styles.priceChip,
                        priceLabel === "Free"
                          ? styles.priceChipMint
                          : styles.priceChipDark,
                      ]}
                    >
                      <Text
                        style={[
                          styles.priceChipText,
                          priceLabel === "Free"
                            ? styles.priceChipTextMint
                            : styles.priceChipTextDark,
                        ]}
                      >
                        {priceLabel}
                      </Text>
                    </View>

                    {!!stop.place.category && (
                      <View style={styles.categoryChip}>
                        <Text style={styles.categoryChipText}>
                          {stop.place.category}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.mapCard}>
        <View style={styles.mapPlaceholder}>
          <IconSymbol size={28} name="map" color="#46655F" />
          <Text style={styles.mapPlaceholderText}>Map preview coming soon</Text>
        </View>

        <Pressable
          style={styles.routeButton}
          onPress={() => router.navigate("/map")}
        >
          <Text style={styles.routeButtonText}>View full route</Text>
          <IconSymbol size={16} name="chevron.right" color="#102C26" />
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.generateButton,
          isGenerating && styles.generateButtonDisabled,
        ]}
        onPress={handleGenerateRoute}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.generateButtonText}>
            {generatedItinerary ? "Regenerate Route" : "Generate Route"}
          </Text>
        )}
      </Pressable>

      <Text style={styles.footerHint}>
        {generatedItinerary?.summary ||
          "We’ll optimize the order and timings for you"}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DBFEF7",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#102C26",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 16,
    color: "#7B8683",
  },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#102C26",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 22,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  segmentButtonActive: {
    backgroundColor: "#103B34",
  },
  segmentText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#48525A",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#102C26",
    padding: 16,
    marginBottom: 24,
  },
  summaryIconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#CFEFE9",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCopy: {
    flex: 1,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102C26",
  },
  summaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  summaryMetaText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C757D",
  },
  summaryMetaDot: {
    marginHorizontal: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#6C757D",
  },
  stopsHeader: {
    marginBottom: 14,
  },
  stopsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stopsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102C26",
  },
  timelineWrapper: {
    position: "relative",
    marginBottom: 24,
    paddingLeft: 4,
  },
  timelineRail: {
    position: "absolute",
    left: 17,
    top: 24,
    bottom: 26,
    width: 3,
    borderRadius: 999,
    backgroundColor: "#12362E",
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 14,
  },
  markerColumn: {
    width: 30,
    alignItems: "center",
    paddingTop: 18,
    zIndex: 1,
  },
  timelineMarker: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#12362E",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineMarkerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  stopCard: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#102C26",
    padding: 12,
    flexDirection: "row",
    gap: 12,
  },
  stopImage: {
    width: 82,
    height: 82,
    borderRadius: 16,
    backgroundColor: "#D7E9E4",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#34524C",
  },
  stopContent: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 4,
  },
  stopTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B8B8B",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102C26",
  },
  stopActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,0,0,0.6)",
  },
  stopTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102C26",
  },
  stopAddress: {
    marginTop: 2,
    fontSize: 14,
    color: "#6B7280",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  priceChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceChipDark: {
    backgroundColor: "#12362E",
  },
  priceChipMint: {
    backgroundColor: "#D8F3EC",
  },
  priceChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  priceChipTextDark: {
    color: "#FFFFFF",
  },
  priceChipTextMint: {
    color: "#184D42",
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#AAB7B3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FFFFFF",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "capitalize",
  },
  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#102C26",
    overflow: "hidden",
    marginBottom: 22,
  },
  mapPreview: {
    height: 140,
    width: "100%",
  },
  mapPlaceholder: {
    height: 140,
    backgroundColor: "#D9ECE7",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#46655F",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  routeButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    margin: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#102C26",
    backgroundColor: "#FFFFFF",
  },
  routeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102C26",
  },
  generateButton: {
    backgroundColor: "#0B3B33",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  footerHint: {
    textAlign: "center",
    fontSize: 15,
    color: "#7A8884",
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
    fontSize: 24,
    fontWeight: "800",
    color: "#102C26",
  },
  emptyText: {
    maxWidth: 280,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#34524C",
  },
});

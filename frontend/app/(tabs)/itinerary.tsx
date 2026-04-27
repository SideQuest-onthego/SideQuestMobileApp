import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSavedPlaces } from "@/context/SavedPlacesContext";
import { buildItineraryViewModel } from "@/services/itineraryEngine";
import type { ItineraryStopResult } from "@/types/itinerary";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
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

function formatLocation(city?: string, state?: string) {
  if (city && state) {
    return `${city}, ${state}`;
  }

  return city || state || "Location unavailable";
}

function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${remainder} min`;
  }

  if (remainder === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}

function TravelRow({ stop }: { stop: ItineraryStopResult }) {
  if (stop.order === 1 || stop.travelTimeMinsFromPrevious <= 0) {
    return null;
  }

  return (
    <View style={styles.travelRow}>
      <View style={styles.travelLine} />
      <View style={styles.travelCard}>
        <IconSymbol size={14} name="car.fill" color="#34524C" />
        <Text style={styles.travelText}>
          {stop.travelTimeMinsFromPrevious} min travel
        </Text>
        <Text style={styles.travelDot}>•</Text>
        <Text style={styles.travelText}>
          {stop.travelDistanceMilesFromPrevious} mi
        </Text>
      </View>
    </View>
  );
}

export default function ItineraryScreen() {
  const router = useRouter();
  const {
    itineraryPlaces,
    generatedItinerary,
    generateItinerary,
    removeFromItinerary,
  } = useSavedPlaces();

  const itineraryView = useMemo(
    () => buildItineraryViewModel(generatedItinerary, itineraryPlaces),
    [generatedItinerary, itineraryPlaces],
  );

  if (itineraryPlaces.length < 5) {
    const placesNeeded = 5 - itineraryPlaces.length;

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconBox}>
          <IconSymbol size={34} name="list.bullet.clipboard" color="#102C26" />
        </View>
        <Text style={styles.emptyTitle}>Build your day plan</Text>
        <Text style={styles.emptyText}>
          Select at least 5 saved places to generate an itinerary for the day.
        </Text>
        <Text style={styles.selectionCount}>
          {itineraryPlaces.length} selected • {placesNeeded} more to go
        </Text>

        {itineraryPlaces.length > 0 ? (
          <View style={styles.selectedList}>
            {itineraryPlaces.map((place) => (
              <View key={place.id} style={styles.selectedPill}>
                <Text style={styles.selectedPillText} numberOfLines={1}>
                  {place.name}
                </Text>

                <Pressable
                  style={styles.selectedPillRemoveButton}
                  onPress={() => removeFromItinerary(place.id)}
                  hitSlop={8}
                >
                  <Text style={styles.selectedPillRemoveText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.navigate("/saved")}
        >
          <Text style={styles.primaryButtonText}>Choose places</Text>
        </Pressable>
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
        <Text style={styles.headerSubtitle}>
          Generated from {itineraryPlaces.length} selected places
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIconBox}>
          <IconSymbol size={28} name="map" color="#102C26" />
        </View>

        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>
            {generatedItinerary?.title ?? "Your Day Plan"}
          </Text>

          <View style={styles.summaryMetaRow}>
            <Text style={styles.summaryMetaText}>
              {generatedItinerary?.totalStops ?? itineraryPlaces.length} stops
            </Text>
            <Text style={styles.summaryMetaDot}>•</Text>
            <Text style={styles.summaryMetaText}>
              {formatHours(
                (generatedItinerary?.totalActivityMinutes ?? 0) +
                  (generatedItinerary?.totalTravelMinutes ?? 0),
              )}
            </Text>
            <Text style={styles.summaryMetaDot}>•</Text>
            <Text style={styles.summaryMetaText}>
              Est. ${generatedItinerary?.totalEstimatedCost ?? 0}
            </Text>
          </View>

          <Text style={styles.summaryRange}>
            {generatedItinerary?.startTime} - {generatedItinerary?.endTime}
          </Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <Pressable style={styles.generateButton} onPress={generateItinerary}>
          <Text style={styles.generateButtonText}>Regenerate itinerary</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.navigate("/saved")}
        >
          <Text style={styles.secondaryButtonText}>Edit selections</Text>
        </Pressable>
      </View>

      <View style={styles.stopsHeader}>
        <View style={styles.stopsHeaderLeft}>
          <IconSymbol size={18} name="list.bullet" color="#102C26" />
          <Text style={styles.stopsTitle}>Day timeline</Text>
        </View>
      </View>

      <View style={styles.timelineWrapper}>
        <View style={styles.timelineRail} />

        {itineraryView.map(({ stop, place }) => {
          const priceLabel = formatPrice(
            place.estimatedCost?.min ?? 0,
            place.estimatedCost?.max ?? 0,
          );

          return (
            <View key={place.id}>
              <TravelRow stop={stop} />

              <View style={styles.stopRow}>
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
                      params: { placeId: place.id },
                    })
                  }
                >
                  {place.links?.imageUrl ? (
                    <Image
                      source={{ uri: place.links.imageUrl }}
                      style={styles.stopImage}
                    />
                  ) : (
                    <View style={[styles.stopImage, styles.imageFallback]}>
                      <Text style={styles.imageFallbackText}>POI</Text>
                    </View>
                  )}

                  <View style={styles.stopContent}>
                    <View style={styles.stopTopRow}>
                      <View>
                        <Text style={styles.timeText}>
                          {stop.startTime} - {stop.endTime}
                        </Text>
                        <Text style={styles.durationText}>
                          {stop.durationMins} min stop
                        </Text>
                      </View>

                      <Text style={styles.priceText}>{priceLabel}</Text>
                    </View>

                    <Text style={styles.stopTitle} numberOfLines={2}>
                      {place.name}
                    </Text>

                    <Text style={styles.stopAddress} numberOfLines={1}>
                      {formatLocation(
                        place.location?.city,
                        place.location?.state,
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

                      {!!place.category ? (
                        <View style={styles.categoryChip}>
                          <Text style={styles.categoryChipText}>
                            {place.category}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Pressable
                      style={styles.removeButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        removeFromItinerary(place.id);
                      }}
                    >
                      <Text style={styles.removeButtonText}>
                        Remove from itinerary
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.mapCard}>
        <View style={styles.mapPlaceholder}>
          <IconSymbol size={28} name="map" color="#46655F" />
          <Text style={styles.mapPlaceholderText}>
            Map preview coming soon
          </Text>
        </View>

        <Pressable
          style={styles.routeButton}
          onPress={() => router.navigate("/map")}
        >
          <Text style={styles.routeButtonText}>View full route</Text>
          <IconSymbol size={16} name="chevron.right" color="#102C26" />
        </Pressable>
      </View>
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
    color: "#5A7069",
  },
  startTimeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#102C26",
    padding: 16,
    marginBottom: 18,
  },
  startTimeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  startTimeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C757D",
  },
  startTimeValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#102C26",
  },
  quickTimesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  quickTimeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    marginRight: 8,
  },
  quickTimeButtonActive: {
    backgroundColor: "#103B34",
    borderColor: "#103B34",
  },
  quickTimeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#48525A",
  },
  quickTimeButtonTextActive: {
    color: "#FFFFFF",
  },
  customTimeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#102C26",
    marginRight: 8,
  },
  customTimeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#102C26",
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
    marginBottom: 18,
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
    fontWeight: "700",
    color: "#5A7069",
  },
  summaryMetaDot: {
    marginHorizontal: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#5A7069",
  },
  summaryRange: {
    fontSize: 14,
    color: "#34524C",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  generateButton: {
    flex: 1,
    backgroundColor: "#0B3B33",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#102C26",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102C26",
  },
  transitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#102C26",
    padding: 16,
    marginBottom: 24,
  },
  transitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  transitTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102C26",
  },
  transitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F9FBFD",
    borderRadius: 12,
    marginBottom: 10,
  },
  transitItemNumber: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 60,
  },
  transitItemNumberText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#102C26",
    backgroundColor: "#CFEFE9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  transitArrow: {
    width: 20,
    height: 2,
    backgroundColor: "#102C26",
  },
  transitDirectionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#34524C",
    lineHeight: 20,
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
    bottom: 24,
    width: 3,
    borderRadius: 999,
    backgroundColor: "#12362E",
  },
  travelRow: {
    flexDirection: "row",
    paddingLeft: 42,
    marginBottom: 10,
  },
  travelLine: {
    position: "absolute",
    left: 17,
    top: -8,
    bottom: -8,
    width: 3,
    backgroundColor: "transparent",
  },
  travelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D9ECE7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  travelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#34524C",
  },
  travelDot: {
    fontSize: 13,
    fontWeight: "700",
    color: "#46655F",
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  timeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#34524C",
  },
  durationText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
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
  removeButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EFF7F4",
    borderWidth: 1,
    borderColor: "#B7CFC8",
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#12362E",
  },
  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#102C26",
    overflow: "hidden",
    marginBottom: 22,
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#DBFEF7",
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#CFEFE9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#102C26",
    marginBottom: 8,
  },
  emptyText: {
    maxWidth: 300,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#34524C",
    marginBottom: 8,
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#46655F",
    marginBottom: 18,
  },
  selectedList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 22,
  },
  selectedPill: {
    width: "46%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#AAB7B3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectedPillText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#12362E",
  },
  selectedPillRemoveButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EFF7F4",
    borderWidth: 1,
    borderColor: "#B7CFC8",
  },
  selectedPillRemoveText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#12362E",
  },
  primaryButton: {
    backgroundColor: "#0B3B33",
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102C26",
    marginBottom: 16,
  },
  timeInput: {
    borderWidth: 1.5,
    borderColor: "#102C26",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#102C26",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#102C26",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#102C26",
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#103B34",
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

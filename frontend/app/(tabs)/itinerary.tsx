import AiItineraryModal from "@/components/AiItineraryModal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Ionicons } from "@expo/vector-icons";
import { useSavedPlaces } from "@/context/SavedPlacesContext";
import {
  fetchGoogleDirections,
  type DirectionsMode,
  type DirectionsRoute,
} from "@/services/googleDirections";
import type { ActivityModel } from "@/types/sidequest-models";
import {
  generateItineraryWithGemini,
  type GeneratedItinerary,
} from "@/services/geminiItinerary";
import { formatCategoryLabel } from "@/services/placeDisplay";
import {
  MAX_ITINERARY_PLACES,
  MIN_ITINERARY_PLACES,
  buildItineraryViewModel,
} from "@/services/itineraryEngine";
import type { ItineraryStopResult } from "@/types/itinerary";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";

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

// Format time object to string (HH:MM AM/PM)
function formatTimeString(hours: number, minutes: number): string {
  const normalizedHours = ((hours % 24) + 24) % 24;
  const period = normalizedHours >= 12 ? "PM" : "AM";
  const displayHours =
    normalizedHours > 12
      ? normalizedHours - 12
      : normalizedHours === 0
        ? 12
        : normalizedHours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function formatMinutesSinceMidnight(minutesSinceMidnight: number): string {
  const normalized = ((minutesSinceMidnight % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return formatTimeString(hours, minutes);
}

// Parse time string to hours and minutes
function parseTimeString(
  timeStr: string,
): { hours: number; minutes: number } | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
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

function calculateTimelineTimes(
  stops: ItineraryStopResult[],
  startHours: number,
  startMinutes: number,
): { startTime: string; endTime: string }[] {
  let clock = startHours * 60 + startMinutes;

  return stops.map((stop) => {
    clock += stop.travelTimeMinsFromPrevious;
    const startTime = formatMinutesSinceMidnight(clock);
    clock += stop.durationMins;
    const endTime = formatMinutesSinceMidnight(clock);

    return { startTime, endTime };
  });
}

const TRANSIT_MODE_OPTIONS: Record<
  DirectionsMode,
  { icon: "tram.fill" | "bus.fill" | "figure.walk"; title: string }
> = {
  rail: {
    icon: "tram.fill",
    title: "Subway",
  },
  bus: {
    icon: "bus.fill",
    title: "Bus",
  },
  walk: {
    icon: "figure.walk",
    title: "Walk",
  },
};

function formatRouteStep(step: DirectionsRoute["steps"][number]) {
  const details: string[] = [];

  if (step.lineName) details.push(step.lineName);
  if (step.numStops) details.push(`${step.numStops} stops`);
  if (step.durationText && step.travelMode !== "WALK") {
    details.push(step.durationText);
  }

  return details.join(" • ");
}

// Expandable Transit Directions Component
function TransitDirections({
  fromPlace,
  toPlace,
  distanceMiles,
  travelMinutes,
  isExpanded,
  onToggle,
}: {
  fromPlace: ActivityModel;
  toPlace: ActivityModel;
  distanceMiles: number;
  travelMinutes: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [selectedMode, setSelectedMode] = useState<DirectionsMode>("rail");
  const [routes, setRoutes] = useState<
    Partial<Record<DirectionsMode, DirectionsRoute | null>>
  >({});
  const [loadingModes, setLoadingModes] = useState<
    Partial<Record<DirectionsMode, boolean>>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const selectedRoute = routes[selectedMode];
  const isLoading = Boolean(loadingModes[selectedMode]);
  const isWalkMode = selectedMode === "walk";
  const visibleSteps = selectedRoute?.steps
    ? showAllSteps
      ? selectedRoute.steps
      : selectedRoute.steps.slice(0, 3)
    : [];

  useEffect(() => {
    if (!isExpanded || selectedRoute !== undefined) {
      return;
    }

    let isCurrent = true;

    setLoadingModes((prev) => ({ ...prev, [selectedMode]: true }));
    setErrorMessage(null);

    fetchGoogleDirections(fromPlace, toPlace, selectedMode)
      .then((route) => {
        if (!isCurrent) return;
        setRoutes((prev) => ({ ...prev, [selectedMode]: route }));
      })
      .catch((error) => {
        if (!isCurrent) return;
        console.log("Failed to fetch Google transit directions:", error);
        setRoutes((prev) => ({ ...prev, [selectedMode]: null }));
        setErrorMessage("Live directions are unavailable right now.");
      })
      .finally(() => {
        if (!isCurrent) return;
        setLoadingModes((prev) => ({ ...prev, [selectedMode]: false }));
      });

    return () => {
      isCurrent = false;
    };
  }, [fromPlace, isExpanded, selectedMode, selectedRoute, toPlace]);

  return (
    <View style={styles.transitContainer}>
      <Pressable style={styles.transitHeader} onPress={onToggle}>
        <View style={styles.transitHeaderLeft}>
          <IconSymbol size={18} name="tram.fill" color="#102C26" />
          <Text style={styles.transitHeaderText}>Live Transit Directions</Text>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#102C26"
        />
      </Pressable>

      {isExpanded && (
        <View style={styles.transitContent}>
          <View style={styles.transitModes}>
            {(Object.keys(TRANSIT_MODE_OPTIONS) as DirectionsMode[]).map(
              (mode) => {
                const option = TRANSIT_MODE_OPTIONS[mode];
                const route = routes[mode];
                const modeIsLoading = Boolean(loadingModes[mode]);
                const timeLabel = modeIsLoading
                  ? "..."
                  : route
                    ? route.durationText
                    : route === null
                      ? "No route"
                      : "Tap";

                return (
                  <Pressable
                    key={mode}
                    style={[
                      styles.transitModeButton,
                      selectedMode === mode && styles.transitModeButtonActive,
                    ]}
                    onPress={() => setSelectedMode(mode)}
                  >
                    <IconSymbol
                      size={16}
                      name={option.icon}
                      color={selectedMode === mode ? "#FFFFFF" : "#34524C"}
                    />
                    <Text
                      style={[
                        styles.transitModeText,
                        selectedMode === mode && styles.transitModeTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {option.title}
                    </Text>
                    <Text
                      style={[
                        styles.transitModeTime,
                        selectedMode === mode && styles.transitModeTimeActive,
                      ]}
                      numberOfLines={1}
                    >
                      {timeLabel}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>

          <View style={styles.transitDetails}>
            <View style={styles.transitDetailsRow}>
              <View style={styles.transitPin}>
                <Text style={styles.transitPinText}>A</Text>
              </View>
              <View style={styles.transitDetailsContent}>
                <Text style={styles.transitDetailsLabel}>From</Text>
                <Text style={styles.transitDetailsPlace} numberOfLines={2}>
                  {fromPlace.name}
                </Text>
              </View>
            </View>

            <View style={styles.transitDirectionsBetween}>
              <View style={styles.transitRouteLineColumn}>
                <View style={styles.transitArrowLine} />
                <View style={styles.transitDirectionsIcon}>
                  <IconSymbol
                    size={16}
                    name={TRANSIT_MODE_OPTIONS[selectedMode].icon}
                    color="#102C26"
                  />
                </View>
                <View style={styles.transitArrowLine} />
              </View>

              <View style={styles.transitDirectionsBox}>
                <View style={styles.transitDirectionsContent}>
                  <Text style={styles.transitDirectionsText}>
                    {isLoading
                      ? "Loading live Google directions..."
                      : selectedRoute
                        ? isWalkMode
                          ? `Walk from ${fromPlace.name} to ${toPlace.name} in ${selectedRoute.durationText}.`
                          : selectedRoute.summary
                        : (errorMessage ??
                          "No live route found for this option.")}
                  </Text>

                  {selectedRoute?.steps.length && !isWalkMode ? (
                    <>
                      <ScrollView
                        style={[
                          styles.transitStepsScroller,
                          showAllSteps && styles.transitStepsScrollerExpanded,
                        ]}
                        contentContainerStyle={styles.transitSteps}
                        nestedScrollEnabled
                        scrollEnabled={showAllSteps}
                        showsVerticalScrollIndicator={showAllSteps}
                      >
                        {visibleSteps.map((step, stepIndex) => (
                          <View
                            key={`${step.instruction}-${stepIndex}`}
                            style={styles.transitStepRow}
                          >
                            <Text style={styles.transitStepBullet}>
                              {stepIndex + 1}
                            </Text>
                            <View style={styles.transitStepCopy}>
                              <Text style={styles.transitStepText}>
                                {step.instruction}
                              </Text>
                              {formatRouteStep(step) ? (
                                <Text style={styles.transitStepMeta}>
                                  {formatRouteStep(step)}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </ScrollView>

                      {selectedRoute.steps.length > 3 ? (
                        <Pressable
                          style={styles.transitStepsToggle}
                          onPress={() => setShowAllSteps((current) => !current)}
                        >
                          <Text style={styles.transitMoreStepsText}>
                            {showAllSteps
                              ? "Show fewer steps"
                              : `+${selectedRoute.steps.length - 3} more steps`}
                          </Text>
                        </Pressable>
                      ) : null}
                    </>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.transitDetailsRow}>
              <View style={styles.transitPin}>
                <Text style={styles.transitPinText}>B</Text>
              </View>
              <View style={styles.transitDetailsContent}>
                <Text style={styles.transitDetailsLabel}>To</Text>
                <Text style={styles.transitDetailsPlace} numberOfLines={2}>
                  {toPlace.name}
                </Text>
              </View>
            </View>

            <View style={styles.transitSummary}>
              <View style={styles.transitSummaryItem}>
                <Text style={styles.transitSummaryLabel}>Duration</Text>
                <Text style={styles.transitSummaryValue} numberOfLines={1}>
                  {selectedRoute?.durationText ?? `${travelMinutes} min`}
                </Text>
              </View>
              <View style={styles.transitSummaryDivider} />
              <View style={styles.transitSummaryItem}>
                <Text style={styles.transitSummaryLabel}>Distance</Text>
                <Text style={styles.transitSummaryValue} numberOfLines={1}>
                  {selectedRoute?.distanceText ??
                    `${distanceMiles.toFixed(1)} mi`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// Start Time Picker Component
function StartTimeCard({
  startTime,
  onTimeChange,
}: {
  startTime: { hours: number; minutes: number };
  onTimeChange: (hours: number, minutes: number) => void;
}) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTime, setCustomTime] = useState(
    formatTimeString(startTime.hours, startTime.minutes),
  );

  const quickTimes = [
    { label: "8 AM", hours: 8, minutes: 0 },
    { label: "9 AM", hours: 9, minutes: 0 },
    { label: "10 AM", hours: 10, minutes: 0 },
    { label: "12 PM", hours: 12, minutes: 0 },
    { label: "2 PM", hours: 14, minutes: 0 },
    { label: "4 PM", hours: 16, minutes: 0 },
  ];

  const currentTimeString = formatTimeString(
    startTime.hours,
    startTime.minutes,
  );
  const isCurrentTime = (hours: number, minutes: number) =>
    startTime.hours === hours && startTime.minutes === minutes;

  const handleCustomTime = () => {
    const parsed = parseTimeString(customTime);
    if (parsed) {
      onTimeChange(parsed.hours, parsed.minutes);
      setShowCustomModal(false);
    }
  };

  return (
    <>
      <View style={styles.startTimeCard}>
        <View style={styles.startTimeHeader}>
          <View>
            <Text style={styles.startTimeLabel}>Start Time</Text>
            <Text style={styles.startTimeValue}>{currentTimeString}</Text>
          </View>
          <IconSymbol size={24} name="clock" color="#102C26" />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickTimesScroll}
          contentContainerStyle={styles.quickTimesContent}
        >
          {quickTimes.map((time) => (
            <Pressable
              key={`${time.hours}-${time.minutes}`}
              style={[
                styles.quickTimeButton,
                isCurrentTime(time.hours, time.minutes) &&
                  styles.quickTimeButtonActive,
              ]}
              onPress={() => onTimeChange(time.hours, time.minutes)}
            >
              <Text
                style={[
                  styles.quickTimeButtonText,
                  isCurrentTime(time.hours, time.minutes) &&
                    styles.quickTimeButtonTextActive,
                ]}
              >
                {time.label}
              </Text>
            </Pressable>
          ))}

          <Pressable
            style={styles.customTimeButton}
            onPress={() => setShowCustomModal(true)}
          >
            <IconSymbol size={14} name="plus" color="#102C26" />
            <Text style={styles.customTimeButtonText}>Custom</Text>
          </Pressable>
        </ScrollView>
      </View>

      <Modal
        visible={showCustomModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Custom Time</Text>

            <TextInput
              style={styles.timeInput}
              placeholder="12:00 PM"
              placeholderTextColor="#A0A0A0"
              value={customTime}
              onChangeText={setCustomTime}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={handleCustomTime}>
                <Text style={styles.modalConfirmText}>Set Time</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function ItineraryScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const {
    itineraryPlaces,
    generatedItinerary,
    generateItinerary,
    removeFromItinerary,
  } = useSavedPlaces();

  // State for start time and expanded transit
  const [startTime, setStartTime] = useState({ hours: 9, minutes: 0 });
  const [expandedTransitStop, setExpandedTransitStop] = useState<number | null>(
    null,
  );

  const itineraryView = useMemo(
    () => buildItineraryViewModel(generatedItinerary, itineraryPlaces),
    [generatedItinerary, itineraryPlaces],
  );

  const [aiItinerary, setAiItinerary] = useState<GeneratedItinerary | null>(
    null,
  );
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const handleGenerateWithAi = useCallback(async () => {
    if (itineraryPlaces.length < MIN_ITINERARY_PLACES || isGeneratingAi) return;

    setAiModalVisible(true);
    setIsGeneratingAi(true);

    try {
      const result = await generateItineraryWithGemini(
        itineraryPlaces,
        formatTimeString(startTime.hours, startTime.minutes),
      );
      setAiItinerary(result);
    } catch (error) {
      console.error("Failed to generate AI itinerary:", error);
      setAiItinerary(null);
    } finally {
      setIsGeneratingAi(false);
    }
  }, [itineraryPlaces, isGeneratingAi, startTime]);

  const timelineTimes = useMemo(
    () =>
      calculateTimelineTimes(
        itineraryView.map(({ stop }) => stop),
        startTime.hours,
        startTime.minutes,
      ),
    [itineraryView, startTime],
  );

  // Calculate map region for miniature preview
  const mapRegion = useMemo(() => {
    if (itineraryPlaces.length === 0) {
      return {
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }

    // Filter places with valid coordinates
    const validPlaces = itineraryPlaces.filter(
      (p) => p.location?.lat && p.location?.lng,
    );

    if (validPlaces.length === 0) {
      return {
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }

    const lats = validPlaces.map((p) => p.location.lat);
    const lons = validPlaces.map((p) => p.location.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.3, 0.1),
      longitudeDelta: Math.max((maxLon - minLon) * 1.3, 0.1),
    };
  }, [itineraryPlaces]);

  if (itineraryPlaces.length < MIN_ITINERARY_PLACES) {
    const placesNeeded = MIN_ITINERARY_PLACES - itineraryPlaces.length;

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconBox}>
          <IconSymbol size={34} name="list.bullet.clipboard" color="#102C26" />
        </View>
        <Text style={styles.emptyTitle}>Build your day plan</Text>
        <Text style={styles.emptyText}>
          Select at least {MIN_ITINERARY_PLACES} saved places to generate an
          itinerary for the day. You can add up to {MAX_ITINERARY_PLACES}.
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
    <SafeAreaView style={styles.container} edges={["top"]}>
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

      {/* START TIME PICKER */}
      <StartTimeCard
        startTime={startTime}
        onTimeChange={(hours, minutes) => setStartTime({ hours, minutes })}
      />

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
            {formatTimeString(startTime.hours, startTime.minutes)} -{" "}
            {timelineTimes.length > 0
              ? timelineTimes[timelineTimes.length - 1].endTime
              : "End time"}
          </Text>
        </View>
      </View>
      <Pressable
        style={[styles.aiButton, isGeneratingAi && styles.aiButtonDisabled]}
        onPress={handleGenerateWithAi}
        disabled={isGeneratingAi}
      >
        <IconSymbol size={18} name="sparkles" color="#FFFFFF" />
        <Text style={styles.aiButtonText}>
          {isGeneratingAi ? "Generating..." : "Generate with Gemini"}
        </Text>
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable style={styles.generateButton} onPress={generateItinerary}>
          <IconSymbol size={18} name="arrow.clockwise" color="#FFFFFF" />
          <Text style={styles.generateButtonText}>Regenerate</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.navigate("/saved")}
        >
          <IconSymbol size={18} name="pencil" color="#102C26" />
          <Text style={styles.secondaryButtonText}>Edit</Text>
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

        {itineraryView.map(({ stop, place }, index) => {
          const priceLabel = formatPrice(
            place.estimatedCost?.min ?? 0,
            place.estimatedCost?.max ?? 0,
          );

          const nextStopView =
            index < itineraryView.length - 1 ? itineraryView[index + 1] : null;
          const nextPlace = nextStopView?.place ?? null;

          return (
            <View key={place.id}>
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
                          {timelineTimes[index]?.startTime ?? stop.startTime} -{" "}
                          {timelineTimes[index]?.endTime ?? stop.endTime}
                        </Text>
                        <Text style={styles.durationText}>
                          {stop.durationMins} min stop
                        </Text>
                      </View>
                      <View style={styles.stopActionsRow}>
                        <Pressable
                          style={styles.deleteButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            removeFromItinerary(place.id);
                          }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color="#FFFFFF"
                          />
                        </Pressable>
                      </View>
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
                            {formatCategoryLabel(place.category, place.type)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              </View>

              {nextStopView && nextPlace ? (
                <>
                  <TransitDirections
                    fromPlace={place}
                    toPlace={nextPlace}
                    distanceMiles={
                      nextStopView.stop.travelDistanceMilesFromPrevious || 1
                    }
                    travelMinutes={
                      nextStopView.stop.travelTimeMinsFromPrevious || 30
                    }
                    isExpanded={expandedTransitStop === index}
                    onToggle={() =>
                      setExpandedTransitStop(
                        expandedTransitStop === index ? null : index,
                      )
                    }
                  />
                  <TravelRow stop={nextStopView.stop} />
                </>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.mapCard}>
        <MapView
          style={styles.mapPreview}
          initialRegion={mapRegion}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {/* Polyline connecting all stops */}
          {itineraryPlaces.length > 1 && (
            <Polyline
              coordinates={itineraryPlaces
                .filter((p) => p.location?.lat && p.location?.lng)
                .map((place) => ({
                  latitude: place.location.lat,
                  longitude: place.location.lng,
                }))}
              strokeColor="#102C26"
              strokeWidth={3}
            />
          )}

          {/* Markers for each stop */}
          {itineraryView.map(({ stop, place }) => (
            <Marker
              key={place.id}
              coordinate={{
                latitude: place.location.lat,
                longitude: place.location.lng,
              }}
              title={place.name}
            >
              <View style={styles.largeMarker}>
                <Text style={styles.largeMarkerText}>{stop.order}</Text>
              </View>
            </Marker>
          ))}
        </MapView>

        <Pressable
          style={styles.routeButton}
          onPress={() => router.navigate("/map")}
        >
          <Text style={styles.routeButtonText}>View full route</Text>
          <IconSymbol size={16} name="chevron.right" color="#102C26" />
        </Pressable>
      </View>

      <AiItineraryModal
        visible={aiModalVisible}
        itinerary={aiItinerary}
        isLoading={isGeneratingAi}
        onClose={() => setAiModalVisible(false)}
      />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DBFEF7",
  },
  content: {
    paddingHorizontal: 15,
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
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "black",
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
  quickTimesContent: {
    paddingVertical: 8,
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
    backgroundColor: "#102C26",
    borderColor: "#102C26",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "black",
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
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#102C26",
    borderRadius: 20,
    paddingVertical: 15,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#102C26",
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  miniMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#102C26",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  miniMarkerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  generateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#102C26",
    borderRadius: 20,
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: "#102C26",
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: "#102C26",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102C26",
  },

  // Transit Directions Styles
  transitContainer: {
    marginLeft: 18,
    marginRight: 24,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#D0E8E2",
    overflow: "hidden",
  },
  transitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  transitHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transitHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102C26",
  },
  transitContent: {
    backgroundColor: "#F9FBFD",
    borderTopWidth: 1.5,
    borderTopColor: "#D0E8E2",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  transitModes: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  transitModeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 70,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D0E8E2",
  },
  transitModeButtonActive: {
    backgroundColor: "#34524C",
    borderColor: "#34524C",
  },
  transitModeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#34524C",
    textAlign: "center",
  },
  transitModeTextActive: {
    color: "#FFFFFF",
  },
  transitModeTime: {
    fontSize: 10,
    fontWeight: "600",
    color: "#5A7069",
    textAlign: "center",
    maxWidth: "100%",
  },
  transitModeTimeActive: {
    color: "#FFFFFF",
  },
  transitDetails: {
    gap: 14,
  },
  transitDetailsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  transitPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#102C26",
    alignItems: "center",
    justifyContent: "center",
  },
  transitPinText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  transitDetailsContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  transitDetailsLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5A7069",
  },
  transitDetailsPlace: {
    fontSize: 13,
    fontWeight: "700",
    color: "#102C26",
    marginTop: 2,
    lineHeight: 17,
  },
  transitArrowContainer: {
    alignItems: "center",
    gap: 6,
  },
  transitArrowLine: {
    width: 2,
    height: 16,
    backgroundColor: "#102C26",
  },
  transitArrowIcon: {
    fontSize: 16,
    color: "#102C26",
    fontWeight: "800",
  },
  transitDirectionsBetween: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  transitRouteLineColumn: {
    width: 28,
    alignItems: "center",
    alignSelf: "stretch",
  },
  transitDirectionsBox: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D0E8E2",
    alignItems: "stretch",
  },
  transitDirectionsIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#CFEFE9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  transitDirectionsText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#34524C",
    lineHeight: 19,
  },
  transitDirectionsContent: {
    flex: 1,
    minWidth: 0,
    width: "100%",
    gap: 10,
  },
  transitStepsScroller: {
    width: "100%",
  },
  transitStepsScrollerExpanded: {
    maxHeight: 260,
  },
  transitSteps: {
    gap: 8,
    paddingBottom: 2,
  },
  transitStepRow: {
    flexDirection: "row",
    gap: 8,
  },
  transitStepBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#34524C",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center",
  },
  transitStepCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  transitStepText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#102C26",
    lineHeight: 17,
  },
  transitStepMeta: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5A7069",
    lineHeight: 15,
  },
  transitMoreStepsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5A7069",
  },
  transitStepsToggle: {
    alignSelf: "flex-start",
    marginLeft: 28,
    paddingVertical: 4,
    paddingRight: 8,
  },
  transitSummary: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8F0EC",
  },
  transitSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  transitSummaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#5A7069",
  },
  transitSummaryValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#102C26",
    marginTop: 4,
    textAlign: "center",
    maxWidth: "100%",
  },
  transitSummaryDivider: {
    width: 1,
    backgroundColor: "#D0E8E2",
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
    borderRadius: 28,
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
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "black",
    overflow: "hidden",
    marginBottom: 22,
  },
  mapPreview: {
    height: 200,
    width: "100%",
  },
  largeMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#102C26",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  largeMarkerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
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
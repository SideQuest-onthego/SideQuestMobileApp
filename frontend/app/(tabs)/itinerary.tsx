import AiItineraryModal from "@/components/AiItineraryModal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Ionicons } from "@expo/vector-icons";
import { useSavedPlaces } from "@/context/SavedPlacesContext";
import {
  generateItineraryWithGemini,
  type GeneratedItinerary,
} from "@/services/geminiItinerary";
import { formatCategoryLabel } from "@/services/placeDisplay";
import { buildItineraryViewModel } from "@/services/itineraryEngine";
import type { ItineraryStopResult } from "@/types/itinerary";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
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

// Calculate distance between two coordinates in miles (haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Calculate trip duration in hours
function calculateTripDuration(stops: any[]): number {
  const validStops = stops.filter((s) => s.location?.lat && s.location?.lng);

  if (validStops.length === 0) return 0;

  // Time spent at each location (1.5 hours per stop)
  const timePerStop = 1.5;
  const timeAtLocations = validStops.length * timePerStop;

  // Travel time between stops (estimated at 30 mph average)
  const averageSpeed = 30; // mph
  let travelDistance = 0;

  for (let i = 0; i < validStops.length - 1; i++) {
    const currentStop = validStops[i];
    const nextStop = validStops[i + 1];

    const distance = calculateDistance(
      currentStop.location.lat,
      currentStop.location.lng,
      nextStop.location.lat,
      nextStop.location.lng,
    );

    travelDistance += distance;
  }

  const travelTime = travelDistance / averageSpeed;

  return timeAtLocations + travelTime;
}

// Calculate arrival times for all stops
function calculateArrivalTimes(
  stops: any[],
  startHours: number,
  startMinutes: number,
): string[] {
  const timePerStop = 1.5; // hours
  const averageSpeed = 30; // mph

  let currentHours = startHours;
  let currentMinutes = startMinutes;
  const arrivalTimes: string[] = [];

  for (let i = 0; i < stops.length; i++) {
    // Add arrival time at this stop
    arrivalTimes.push(formatTimeString(currentHours, currentMinutes));

    // If not the last stop, calculate travel time to next stop
    if (i < stops.length - 1) {
      const currentStop = stops[i];
      const nextStop = stops[i + 1];

      if (currentStop.location?.lat && nextStop.location?.lat) {
        // Travel time
        const distance = calculateDistance(
          currentStop.location.lat,
          currentStop.location.lng,
          nextStop.location.lat,
          nextStop.location.lng,
        );
        const travelTimeHours = distance / averageSpeed;

        // Time at current location
        const totalMinutes =
          currentMinutes + (travelTimeHours + timePerStop) * 60;
        currentHours += Math.floor(totalMinutes / 60);
        currentMinutes = Math.floor(totalMinutes % 60);
      } else {
        // Fallback: just add time per stop
        const totalMinutes = currentMinutes + timePerStop * 60;
        currentHours += Math.floor(totalMinutes / 60);
        currentMinutes = Math.floor(totalMinutes % 60);
      }
    }
  }

  return arrivalTimes;
}

// MTA Subway station database for major NYC locations
const MTA_STATION_MAP: { [key: string]: { station: string; lines: string[] } } =
  {
    "statue of liberty": { station: "Bowling Green", lines: ["4", "5"] },
    "liberty island": { station: "Bowling Green", lines: ["4", "5"] },
    "metropolitan museum": { station: "86th Street", lines: ["4", "5"] },
    "met museum": { station: "86th Street", lines: ["4", "5"] },
    "brooklyn bridge": {
      station: "Brooklyn Bridge-City Hall",
      lines: ["4", "5", "6"],
    },
    "times square": {
      station: "Times Square-42nd Street",
      lines: ["1", "2", "3", "7", "A", "C", "E"],
    },
    "central park": {
      station: "59th Street-Columbus Circle",
      lines: ["1", "A", "B", "C", "D"],
    },
    "empire state building": {
      station: "34th Street-Herald Square",
      lines: ["B", "D", "F", "M", "N", "Q", "R", "W"],
    },
    "grand central": {
      station: "Grand Central-42nd Street",
      lines: ["4", "5", "6", "7"],
    },
  };

// Get nearest MTA station for a place
function getNearestMTAStation(
  place: any,
): { station: string; lines: string[] } | null {
  const placeName = place.name?.toLowerCase() || "";

  // Check for direct match
  for (const [key, value] of Object.entries(MTA_STATION_MAP)) {
    if (placeName.includes(key)) {
      return value;
    }
  }

  // Default fallback
  return null;
}

// Get transit directions between two stops
function getTransitDirections(fromPlace: any, toPlace: any): string {
  const fromStation = getNearestMTAStation(fromPlace);
  const toStation = getNearestMTAStation(toPlace);

  if (!fromStation || !toStation) {
    return "Check MTA website for directions";
  }

  // Find common lines or suggest transfer
  const commonLines = fromStation.lines.filter((line) =>
    toStation.lines.includes(line),
  );

  if (commonLines.length > 0) {
    return `Take ${commonLines.join("/")} train from ${fromStation.station} to ${toStation.station}`;
  } else {
    // Suggest a transfer (simplified logic)
    return `From ${fromStation.station} (${fromStation.lines.join("/")}), transfer to ${toStation.station} (${toStation.lines.join("/")})`;
  }
}

// Transit options generator
function getTransitOptions(
  fromPlace: any,
  toPlace: any,
  distanceMiles: number,
  travelMinutes: number,
) {
  const trainDirections = getTransitDirections(fromPlace, toPlace);
  
  return {
    train: {
      mode: "train",
      icon: "tram.fill",
      title: "Subway",
      time: Math.ceil(travelMinutes * 0.8), // 20% faster with subway
      description: trainDirections,
    },
    bus: {
      mode: "bus",
      icon: "bus.fill",
      title: "Bus",
      time: Math.ceil(travelMinutes * 1.1), // 10% slower
      description: `Take local bus from ${fromPlace.name} to ${toPlace.name}`,
    },
    walk: {
      mode: "walk",
      icon: "figure.walk",
      title: "Walk",
      time: Math.ceil((distanceMiles * 20) / 1), // ~20 min per mile
      description: `Walk ${distanceMiles.toFixed(1)} miles (scenic route)`,
    },
  };
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
  fromPlace: any;
  toPlace: any;
  distanceMiles: number;
  travelMinutes: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const options = getTransitOptions(fromPlace, toPlace, distanceMiles, travelMinutes);
  const [selectedMode, setSelectedMode] = useState<"train" | "bus" | "walk">("train");

  return (
    <View style={styles.transitContainer}>
      <Pressable style={styles.transitHeader} onPress={onToggle}>
        <View style={styles.transitHeaderLeft}>
          <IconSymbol size={18} name="tram.fill" color="#102C26" />
          <Text style={styles.transitHeaderText}>Transit Options</Text>
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
            {(Object.keys(options) as Array<"train" | "bus" | "walk">).map(
              (mode) => {
                const option = options[mode];
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
                      name={option.icon as any}
                      color={selectedMode === mode ? "#FFFFFF" : "#34524C"}
                    />
                    <Text
                      style={[
                        styles.transitModeText,
                        selectedMode === mode && styles.transitModeTextActive,
                      ]}
                    >
                      {option.title}
                    </Text>
                    <Text
                      style={[
                        styles.transitModeTime,
                        selectedMode === mode && styles.transitModeTimeActive,
                      ]}
                    >
                      {option.time}m
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          <View style={styles.transitDetails}>
            <View style={styles.transitDetailsRow}>
              <View style={styles.transitPin}>
                <Text style={styles.transitPinText}>A</Text>
              </View>
              <View style={styles.transitDetailsContent}>
                <Text style={styles.transitDetailsLabel}>From</Text>
                <Text style={styles.transitDetailsPlace}>{fromPlace.name}</Text>
              </View>
            </View>

            <View style={styles.transitArrowContainer}>
              <View style={styles.transitArrowLine} />
              <Text style={styles.transitArrowIcon}>↓</Text>
            </View>

            <View style={styles.transitDetailsRow}>
              <View style={styles.transitPin}>
                <Text style={styles.transitPinText}>B</Text>
              </View>
              <View style={styles.transitDetailsContent}>
                <Text style={styles.transitDetailsLabel}>To</Text>
                <Text style={styles.transitDetailsPlace}>{toPlace.name}</Text>
              </View>
            </View>

            <View style={styles.transitDirectionsBox}>
              <View style={styles.transitDirectionsIcon}>
                <IconSymbol
                  size={16}
                  name={options[selectedMode].icon as any}
                  color="#102C26"
                />
              </View>
              <Text style={styles.transitDirectionsText}>
                {options[selectedMode].description}
              </Text>
            </View>

            <View style={styles.transitSummary}>
              <View style={styles.transitSummaryItem}>
                <Text style={styles.transitSummaryLabel}>Duration</Text>
                <Text style={styles.transitSummaryValue}>
                  {options[selectedMode].time} min
                </Text>
              </View>
              <View style={styles.transitSummaryDivider} />
              <View style={styles.transitSummaryItem}>
                <Text style={styles.transitSummaryLabel}>Distance</Text>
                <Text style={styles.transitSummaryValue}>
                  {distanceMiles.toFixed(1)} mi
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
              <Pressable
                style={styles.modalConfirm}
                onPress={handleCustomTime}
              >
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
    if (itineraryPlaces.length < 5 || isGeneratingAi) return;

    setAiModalVisible(true);
    setIsGeneratingAi(true);

    try {
      const result = await generateItineraryWithGemini(itineraryPlaces);
      setAiItinerary(result);
    } catch (error) {
      console.error("Failed to generate AI itinerary:", error);
      setAiItinerary(null);
    } finally {
      setIsGeneratingAi(false);
    }
  }, [itineraryPlaces, isGeneratingAi]);
  // Calculate arrival times based on start time
  const arrivalTimes = useMemo(
    () =>
      calculateArrivalTimes(
        itineraryPlaces,
        startTime.hours,
        startTime.minutes,
      ),
    [itineraryPlaces, startTime],
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

      {/* START TIME PICKER */}
      <StartTimeCard
        startTime={startTime}
        onTimeChange={(hours, minutes) =>
          setStartTime({ hours, minutes })
        }
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
            {arrivalTimes.length > 0
              ? arrivalTimes[arrivalTimes.length - 1]
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
          {isGeneratingAi ? "Generating..." : "Generate route with Gemini"}
        </Text>
      </Pressable>

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

        {itineraryView.map(({ stop, place }, index) => {
          const priceLabel = formatPrice(
            place.estimatedCost?.min ?? 0,
            place.estimatedCost?.max ?? 0,
          );

          const nextPlace =
            index < itineraryPlaces.length - 1
              ? itineraryPlaces[index + 1]
              : null;

          return (
            <View key={place.id}>
              <TravelRow stop={stop} />

              {/* TRANSIT DIRECTIONS - Under Train Direction */}
              {nextPlace && (
                <TransitDirections
                  fromPlace={place}
                  toPlace={nextPlace}
                  distanceMiles={stop.travelDistanceMilesFromPrevious || 1}
                  travelMinutes={stop.travelTimeMinsFromPrevious || 30}
                  isExpanded={expandedTransitStop === index}
                  onToggle={() =>
                    setExpandedTransitStop(
                      expandedTransitStop === index ? null : index,
                    )
                  }
                />
              )}

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
                          {arrivalTimes[index] || stop.startTime} -{" "}
                          {stop.endTime}
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
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0B3B33",
    borderRadius: 18,
    paddingVertical: 16,
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

  // Transit Directions Styles
  transitContainer: {
    marginHorizontal: 30,
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
    paddingVertical: 14,
  },
  transitModes: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  transitModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
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
    fontSize: 12,
    fontWeight: "700",
    color: "#34524C",
  },
  transitModeTextActive: {
    color: "#FFFFFF",
  },
  transitModeTime: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5A7069",
  },
  transitModeTimeActive: {
    color: "#FFFFFF",
  },
  transitDetails: {
    gap: 12,
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
  transitDirectionsBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D0E8E2",
    alignItems: "flex-start",
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
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#34524C",
    lineHeight: 18,
  },
  transitSummary: {
    flexDirection: "row",
    gap: 12,
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
    fontSize: 13,
    fontWeight: "800",
    color: "#102C26",
    marginTop: 4,
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

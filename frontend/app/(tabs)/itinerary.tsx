import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSavedPlaces } from "@/context/SavedPlacesContext";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Modal,
  TextInput,
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

// Calculate distance between two coordinates in miles (haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
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
      nextStop.location.lng
    );

    travelDistance += distance;
  }

  const travelTime = travelDistance / averageSpeed;

  return timeAtLocations + travelTime;
}

// Format time object to string (HH:MM AM/PM)
function formatTimeString(hours: number, minutes: number): string {
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Parse time string to hours and minutes
function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

// MTA Subway station database for major NYC locations
const MTA_STATION_MAP: { [key: string]: { station: string; lines: string[] } } = {
  "statue of liberty": { station: "Bowling Green", lines: ["4", "5"] },
  "liberty island": { station: "Bowling Green", lines: ["4", "5"] },
  "metropolitan museum": { station: "86th Street", lines: ["4", "5"] },
  "met museum": { station: "86th Street", lines: ["4", "5"] },
  "brooklyn bridge": { station: "Brooklyn Bridge-City Hall", lines: ["4", "5", "6"] },
  "times square": { station: "Times Square-42nd Street", lines: ["1", "2", "3", "7", "A", "C", "E"] },
  "central park": { station: "59th Street-Columbus Circle", lines: ["1", "A", "B", "C", "D"] },
  "empire state building": { station: "34th Street-Herald Square", lines: ["B", "D", "F", "M", "N", "Q", "R", "W"] },
  "grand central": { station: "Grand Central-42nd Street", lines: ["4", "5", "6", "7"] },
};

// Get nearest MTA station for a place
function getNearestMTAStation(place: any): { station: string; lines: string[] } | null {
  const placeName = place.name?.toLowerCase() || "";
  
  // Check for direct match
  for (const [key, value] of Object.entries(MTA_STATION_MAP)) {
    if (placeName.includes(key)) {
      return value;
    }
  }
  
  // Default fallback (could be enhanced with real geocoding)
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
    toStation.lines.includes(line)
  );

  if (commonLines.length > 0) {
    return `Take ${commonLines.join("/")} train from ${fromStation.station} to ${toStation.station}`;
  } else {
    // Suggest a transfer (simplified logic)
    return `From ${fromStation.station} (${fromStation.lines.join("/")}), transfer to ${toStation.station} (${toStation.lines.join("/")})`;
  }
}

// Calculate arrival times for all stops
function calculateArrivalTimes(
  stops: any[],
  startHours: number,
  startMinutes: number
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
          nextStop.location.lng
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

export default function ItineraryScreen() {
  const router = useRouter();
  const { savedPlaces } = useSavedPlaces();
  const mapRef = useRef<any>(null);

  // Start time state
  const [startHours, setStartHours] = useState(10); // Default 10:00 AM
  const [startMinutes, setStartMinutes] = useState(0);
  const [showCustomTimeModal, setShowCustomTimeModal] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState("10:00 AM");

  const itineraryStops = useMemo(() => {
    return savedPlaces.slice(0, 4);
  }, [savedPlaces]);

  const totalEstimatedCost = useMemo(() => {
    return itineraryStops.reduce((total, place) => {
      return (
        total +
        getAveragePrice(place.estimatedCost.min, place.estimatedCost.max)
      );
    }, 0);
  }, [itineraryStops]);

  const tripDurationHours = useMemo(() => {
    return calculateTripDuration(itineraryStops);
  }, [itineraryStops]);

  const formatDuration = (hours: number): string => {
    if (hours === 0) return "0 hrs";
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    if (minutes === 0) {
      return `${wholeHours} hr${wholeHours !== 1 ? "s" : ""}`;
    }

    return `${wholeHours}h ${minutes}m`;
  };

  // Calculate arrival times based on start time
  const arrivalTimes = useMemo(() => {
    return calculateArrivalTimes(itineraryStops, startHours, startMinutes);
  }, [itineraryStops, startHours, startMinutes]);

  // Extract route coordinates for polyline
  const routeCoordinates = useMemo(() => {
    return itineraryStops
      .filter((place) => place.location?.lat && place.location?.lng)
      .map((place) => ({
        latitude: place.location.lat,
        longitude: place.location.lng,
      }));
  }, [itineraryStops]);

  // Calculate map bounds to fit all stops
  const mapInitialRegion = useMemo(() => {
    if (routeCoordinates.length === 0) {
      return {
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }

    const lats = routeCoordinates.map((c) => c.latitude);
    const lngs = routeCoordinates.map((c) => c.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: (maxLat - minLat) * 1.5,
      longitudeDelta: (maxLng - minLng) * 1.5,
    };
  }, [routeCoordinates]);

  // Quick time buttons
  const quickTimes = [
    { label: "Now", hours: new Date().getHours(), minutes: new Date().getMinutes() },
    { label: "9:00 AM", hours: 9, minutes: 0 },
    { label: "10:00 AM", hours: 10, minutes: 0 },
    { label: "11:00 AM", hours: 11, minutes: 0 },
    { label: "12:00 PM", hours: 12, minutes: 0 },
    { label: "1:00 PM", hours: 13, minutes: 0 },
    { label: "2:00 PM", hours: 14, minutes: 0 },
  ];

  const handleQuickTime = (hours: number, minutes: number) => {
    setStartHours(hours);
    setStartMinutes(minutes);
  };

  const handleCustomTime = () => {
    const parsed = parseTimeString(customTimeInput);
    if (parsed) {
      setStartHours(parsed.hours);
      setStartMinutes(parsed.minutes);
      setShowCustomTimeModal(false);
    }
  };

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

  // Load MapView only on native platforms
  const MapView = Platform.OS !== "web" ? require("react-native-maps").default : null;
  const { Marker, Polyline } = Platform.OS !== "web" ? require("react-native-maps") : {};

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

      {/* Start Time Selector */}
      <View style={styles.startTimeCard}>
        <View style={styles.startTimeHeader}>
          <Text style={styles.startTimeLabel}>Start Time</Text>
          <Text style={styles.startTimeValue}>
            {formatTimeString(startHours, startMinutes)}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickTimesScroll}
        >
          {quickTimes.map((time, index) => (
            <Pressable
              key={index}
              style={[
                styles.quickTimeButton,
                startHours === time.hours && startMinutes === time.minutes
                  ? styles.quickTimeButtonActive
                  : null,
              ]}
              onPress={() => handleQuickTime(time.hours, time.minutes)}
            >
              <Text
                style={[
                  styles.quickTimeButtonText,
                  startHours === time.hours && startMinutes === time.minutes
                    ? styles.quickTimeButtonTextActive
                    : null,
                ]}
              >
                {time.label}
              </Text>
            </Pressable>
          ))}

          <Pressable
            style={styles.customTimeButton}
            onPress={() => setShowCustomTimeModal(true)}
          >
            <Text style={styles.customTimeButtonText}>Custom</Text>
          </Pressable>
        </ScrollView>
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
              {formatDuration(tripDurationHours)}
            </Text>
            <Text style={styles.summaryMetaDot}>•</Text>
            <Text style={styles.summaryMetaText}>
              Est. ${totalEstimatedCost}
            </Text>
          </View>
        </View>
      </View>

      {/* Transit Directions */}
      {itineraryStops.length > 1 && (
        <View style={styles.transitCard}>
          <View style={styles.transitHeader}>
            <IconSymbol size={20} name="tram" color="#102C26" />
            <Text style={styles.transitTitle}>Train Directions</Text>
          </View>

          {itineraryStops.map((place, index) => {
            if (index === itineraryStops.length - 1) return null; // Skip last stop

            const nextPlace = itineraryStops[index + 1];
            const transitDirection = getTransitDirections(place, nextPlace);

            return (
              <View key={`transit-${index}`} style={styles.transitItem}>
                <View style={styles.transitItemNumber}>
                  <Text style={styles.transitItemNumberText}>{index + 1}</Text>
                  <View style={styles.transitArrow} />
                  <Text style={styles.transitItemNumberText}>{index + 2}</Text>
                </View>
                <Text style={styles.transitDirectionText}>{transitDirection}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.stopsHeader}>
        <View style={styles.stopsHeaderLeft}>
          <IconSymbol size={18} name="list.bullet" color="#102C26" />
          <Text style={styles.stopsTitle}>Your Stops</Text>
        </View>
      </View>

      <View style={styles.timelineWrapper}>
        <View style={styles.timelineRail} />

        {itineraryStops.map((place, index) => {
          const priceLabel = formatPrice(
            place.estimatedCost.min,
            place.estimatedCost.max,
          );
          const arrivalTime = arrivalTimes[index] || "TBD";

          return (
            <View key={place.id} style={styles.stopRow}>
              <View style={styles.markerColumn}>
                <View style={styles.timelineMarker}>
                  <Text style={styles.timelineMarkerText}>{index + 1}</Text>
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
                    <View style={styles.timeRow}>
                      <IconSymbol size={14} name="clock" color="#8B8B8B" />
                      <Text style={styles.timeText}>
                        {arrivalTime}
                      </Text>
                    </View>

                    <Text style={styles.priceText}>{priceLabel}</Text>
                  </View>

                  <Text style={styles.stopTitle} numberOfLines={2}>
                    {place.name}
                  </Text>

                  <Text style={styles.stopAddress} numberOfLines={1}>
                    {formatLocation(place.location.city, place.location.state)}
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

                    {!!place.category && (
                      <View style={styles.categoryChip}>
                        <Text style={styles.categoryChipText}>
                          {place.category}
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
        {Platform.OS !== "web" && MapView && routeCoordinates.length > 0 ? (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.mapPreview}
              mapType="standard"
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              initialRegion={mapInitialRegion}
            >
              {/* Draw route polyline connecting all stops */}
              {Polyline && (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#FF6600"
                  strokeWidth={3}
                  lineDashPattern={[0]}
                />
              )}

              {/* Markers for each stop */}
              {Marker &&
                itineraryStops.map((place, index) => {
                  if (!place.location?.lat || !place.location?.lng) return null;

                  return (
                    <Marker
                      key={place.id}
                      coordinate={{
                        latitude: place.location.lat,
                        longitude: place.location.lng,
                      }}
                      pinColor={index === 0 ? "#0066FF" : "#FF6600"}
                      title={place.name}
                      description={`Stop ${index + 1}`}
                    />
                  );
                })}
            </MapView>
          </View>
        ) : (
          <View style={styles.mapPlaceholder}>
            <IconSymbol size={28} name="map" color="#46655F" />
            <Text style={styles.mapPlaceholderText}>Map preview coming soon</Text>
          </View>
        )}

        <Pressable
          style={styles.routeButton}
          onPress={() => router.navigate("/map")}
        >
          <Text style={styles.routeButtonText}>View full route</Text>
          <IconSymbol size={16} name="chevron.right" color="#102C26" />
        </Pressable>
      </View>

      <Pressable
        style={styles.generateButton}
        onPress={() => router.navigate("/map")}
      >
        <Text style={styles.generateButtonText}>Generate Route</Text>
      </Pressable>

      <Text style={styles.footerHint}>
        We'll optimize the order and timings for you
      </Text>

      {/* Custom Time Modal */}
      <Modal
        visible={showCustomTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Custom Time</Text>
            <TextInput
              style={styles.timeInput}
              placeholder="HH:MM AM/PM"
              placeholderTextColor="#999"
              value={customTimeInput}
              onChangeText={setCustomTimeInput}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowCustomTimeModal(false)}
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
  mapContainer: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
  },
  mapPreview: {
    width: "100%",
    height: "100%",
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

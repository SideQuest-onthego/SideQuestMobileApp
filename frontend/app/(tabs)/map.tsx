import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Platform,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Keyboard,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import Slider from "@react-native-community/slider";

type Place = {
  id: number;
  title: string;
  description: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  isUserAdded?: boolean;
};

const DEFAULT_PLACES: Place[] = [ //SomeHardcoded sample places in NYC (will be replaced by backend data in the future)
  {
    id: 1,
    title: "Statue of Liberty",
    description: "Iconic national monument",
    coordinate: { latitude: 40.6892, longitude: -74.0445 },
  },
  {
    id: 2,
    title: "Museum of Natural History",
    description: "World-famous natural history museum",
    coordinate: { latitude: 40.7813, longitude: -73.974 },
  },
  {
    id: 3,
    title: "Central Park",
    description: "843-acre urban park",
    coordinate: { latitude: 40.7851, longitude: -73.9683 },
  },
  {
    id: 4,
    title: "Brooklyn Bridge",
    description: "Historic suspension bridge",
    coordinate: { latitude: 40.7061, longitude: -73.9969 },
  },
  {
    id: 5,
    title: "Empire State Building",
    description: "Iconic Art Deco skyscraper",
    coordinate: { latitude: 40.7484, longitude: -73.9857 },
  },
  {
    id: 6,
    title: "Times Square",
    description: "The crossroads of the world",
    coordinate: { latitude: 40.758, longitude: -73.9855 },
  },
  {
    id: 7,
    title: "The High Line",
    description: "Elevated linear park",
    coordinate: { latitude: 40.748, longitude: -74.0048 },
  },
];

// Haversine formula — returns distance in miles between two coords
// Source: https://stackoverflow.com/a/21623206
function getDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3958.8;
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
// Converts miles to latitudeDelta and longitudeDelta for map zoom level
function milesToDelta(miles: number) {
  return {
    latitudeDelta: miles / 69,
    longitudeDelta: miles / 55,
  };
}
// Main Map Screen
export default function MapScreen() {
  const [places, setPlaces] = useState<Place[]>(DEFAULT_PLACES);
  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [pendingCoordinate, setPendingCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [newPlaceName, setNewPlaceName] = useState<string>("");
  const [newPlaceDesc, setNewPlaceDesc] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [radiusMiles, setRadiusMiles] = useState<number>(10);
  const [sliderVisible, setSliderVisible] = useState<boolean>(false);
  const mapRef = useRef<any>(null);

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <Text>Map is not available on web</Text>
      </View>
    );
  }
 // Dynamically import MapView and related components to avoid issues on web
  const MapView = require("react-native-maps").default;
  const { Polygon, Marker, Circle } = require("react-native-maps");

  const defaultCenter = { latitude: 40.7128, longitude: -74.006 };
  const mapCenter = userLocation || defaultCenter;
// Tristate area polygon (NY-NJ-CT border region)
  const tristateArea = [
    { latitude: 41.3628, longitude: -74.6944 },
    { latitude: 41.3573, longitude: -73.5543 },
    { latitude: 41.1765, longitude: -72.8182 },
    { latitude: 40.9176, longitude: -72.0049 },
    { latitude: 40.5174, longitude: -74.2591 },
    { latitude: 39.4957, longitude: -74.917 },
    { latitude: 40.0757, longitude: -75.1997 },
    { latitude: 41.3628, longitude: -74.6944 },
  ];

  // Filter places within radius (only when user location is known)
  const visiblePlaces = userLocation
    ? places.filter((p) =>
        getDistanceMiles(
          userLocation.latitude, userLocation.longitude,
          p.coordinate.latitude, p.coordinate.longitude
        ) <= radiusMiles
      )
    : places;
// Handle "Add My Location" button press
  async function handleAddCurrentLocation() {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLocation(coords);
      setPendingCoordinate(coords);
      setNewPlaceName("");
      setNewPlaceDesc("");
      setModalVisible(true);

      // Zoom map to user location with current radius
      mapRef.current?.animateToRegion(
        { ...coords, ...milesToDelta(radiusMiles) },
        600
      );
    } catch {
      Alert.alert("Error", "Could not get your location. Please try again.");
    } finally {
      setLoadingLocation(false);
    }
  }
// Handle saving a new place from the modal
  function handleSavePlace() {
    if (!pendingCoordinate) return;
    if (newPlaceName.trim().length === 0) {
      Alert.alert("Name required", "Please enter a name for this place.");
      return;
    }
    const newPlace: Place = {
      id: Date.now(),
      title: newPlaceName.trim(),
      description: newPlaceDesc.trim() || "My saved location",
      coordinate: pendingCoordinate,
      isUserAdded: true,
    };
    setPlaces((prev) => [...prev, newPlace]);
    setModalVisible(false);
    setSelectedId(newPlace.id);
    mapRef.current?.animateToRegion(
      { ...pendingCoordinate, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600
    );
  }
// Handle distance slider changes
  function handleSliderChange(val: number) {
    const rounded = Math.round(val * 4) / 4;
    setRadiusMiles(rounded);
    mapRef.current?.animateToRegion(
      { ...mapCenter, ...milesToDelta(rounded) },
      300
    );
  }
// Handle search input changes
  function handleSearch(text: string) {
    setQuery(text);
    if (text.trim().length === 0) { setSuggestions([]); return; }
    setSuggestions(
      places.filter((p) => p.title.toLowerCase().includes(text.toLowerCase()))
    );
  }
// Handle selecting a place from search suggestions
  function handleSelect(place: Place) {
    setQuery(place.title);
    setSuggestions([]);
    setSelectedId(place.id);
    Keyboard.dismiss();
    mapRef.current?.animateToRegion(
      { ...place.coordinate, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600
    );
  }
// Handle clearing the search input
  function handleClear() {
    setQuery("");
    setSuggestions([]);
    setSelectedId(null);
    mapRef.current?.animateToRegion(
      { ...defaultCenter, latitudeDelta: 0.0922, longitudeDelta: 0.0421 },
      600
    );
  }
// Main render
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        mapType="standard"
        initialRegion={{ ...defaultCenter, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }}
      >
        <Polygon
          coordinates={tristateArea}
          strokeColor="#FF0000"
          fillColor="rgba(255, 0, 0, 0.1)"
          strokeWidth={2}
        />

        {/* Radius circle centered on user */}
        {userLocation && (
          <Circle
            center={userLocation}
            radius={radiusMiles * 1609.34}
            strokeColor="rgba(0, 102, 255, 0.5)"
            fillColor="rgba(0, 102, 255, 0.08)"
            strokeWidth={2}
          />
        )}

        {/* User location pin */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            pinColor="#0066FF"
            title="You are here"
          />
        )}
// Place markers
        {visiblePlaces.map((place: Place) => (
          <Marker
            key={place.id}
            coordinate={place.coordinate}
            pinColor={
              selectedId === place.id
                ? "#FF6600"
                : place.isUserAdded
                ? "#0066FF"
                : "#FF0000"
            }
            title={place.title}
            description={place.description}
          />
        ))}
      </MapView>

      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search places..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {suggestions.length > 0 && (
          <FlatList<Place>
            style={styles.suggestions}
            data={suggestions}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.suggestionTitle}>
                  {item.isUserAdded ? "📍 " : ""}{item.title}
                </Text>
                <Text style={styles.suggestionDesc}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {query.length > 0 && suggestions.length === 0 && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No places found</Text>
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomPanel}>

        {/* Distance slider toggle + panel */}
        <TouchableOpacity
          style={styles.sliderToggle}
          onPress={() => setSliderVisible((v) => !v)}
        >
          <Text style={styles.sliderToggleText}>
          Travel Distance: {radiusMiles} miles
          </Text>
          <Text style={styles.sliderToggleChevron}>
            {sliderVisible ? "▼" : "▲"}
          </Text>
        </TouchableOpacity>

        {sliderVisible && (
          <View style={styles.sliderPanel}>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderTick}>0.5 mi</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={50}
                step={0.5}
                value={radiusMiles}
                onValueChange={handleSliderChange}
                minimumTrackTintColor="#BFD7EA"
                maximumTrackTintColor="#ddd"
                thumbTintColor="#BFD7EA"
              />
              <Text style={styles.sliderTick}>50 mi</Text>
            </View>
            <Text style={styles.sliderSubtext}>
              {userLocation
                ? `Showing ${visiblePlaces.length} place${visiblePlaces.length !== 1 ? "s" : ""} within ${radiusMiles} mi`
                : "Add your location to filter by distance"}
            </Text>
          </View>
        )}

        {/* Add My Location button */}
        <TouchableOpacity
          style={styles.addLocationBtn}
          onPress={handleAddCurrentLocation}
          disabled={loadingLocation}
        >
          {loadingLocation ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Text style={styles.addLocationIcon}>＋</Text>
              <Text style={styles.addLocationText}>Add My Location</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Save Place Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save This Location</Text>
            <Text style={styles.modalCoords}>
              {pendingCoordinate
                ? `${pendingCoordinate.latitude.toFixed(5)}, ${pendingCoordinate.longitude.toFixed(5)}`
                : ""}
            </Text>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. My Apartment"
              placeholderTextColor="#aaa"
              value={newPlaceName}
              onChangeText={setNewPlaceName}
            />
            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Home base"
              placeholderTextColor="#aaa"
              value={newPlaceDesc}
              onChangeText={setNewPlaceDesc}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePlace}>
                <Text style={styles.saveBtnText}>Save Place</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
// This is pretty much all styling down here
const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrapper: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: "#333" },
  clearBtn: { fontSize: 14, color: "#999", paddingHorizontal: 4 },
  suggestions: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionTitle: { fontSize: 14, fontWeight: "600", color: "#222" },
  suggestionDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  noResults: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 6,
    padding: 16,
    alignItems: "center",
  },
  noResultsText: { color: "#999", fontSize: 14 },
  bottomPanel: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    gap: 10,
  },
  sliderToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  sliderToggleText: { fontSize: 14, fontWeight: "600", color: "#333" },
  sliderToggleChevron: { fontSize: 12, color: "#999" },
  sliderPanel: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  slider: { flex: 1, height: 40 },
  sliderTick: { fontSize: 11, color: "#999", width: 36, textAlign: "center" },
  sliderSubtext: {
    textAlign: "center",
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
addLocationBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#BFD7EA",
  paddingVertical: 13,
  paddingHorizontal: 24,
  borderRadius: 30,
  borderWidth: 1.5,
  borderColor: "#000",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.25,
  shadowRadius: 6,
  elevation: 6,
  gap: 8,
},
addLocationIcon: { color: "#000", fontSize: 20, fontWeight: "700" },
addLocationText: { color: "#000", fontSize: 15, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#222", marginBottom: 4 },
  modalCoords: { fontSize: 12, color: "#999", marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#333",
    marginBottom: 16,
  },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: {
  flex: 1,
  paddingVertical: 13,
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: "#000",
  alignItems: "center",
},
cancelBtnText: { fontSize: 15, color: "#000", fontWeight: "600" },
  saveBtn: {
  flex: 1,
  paddingVertical: 13,
  borderRadius: 12,
  backgroundColor: "#BFD7EA",
  borderWidth: 1.5,
  borderColor: "#000",
  alignItems: "center",
},
saveBtnText: { fontSize: 15, color: "#000", fontWeight: "700" },
}); 
import React, { useState, useRef, useEffect } from "react";
import { useSavedPlaces } from "../../context/SavedPlacesContext";
import { useLocation } from "@/context/LocationContext";
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
import { useLocalSearchParams } from "expo-router";

type Place = {
  id: string;
  title: string;
  description: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  isUserAdded?: boolean;
  isGeoResult?: boolean;
};

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

function milesToDelta(miles: number) {
  return {
    latitudeDelta: miles / 69,
    longitudeDelta: miles / 55,
  };
}

export default function MapScreen() {
  const { savedPlaces } = useSavedPlaces();

  // ── Synced with LocationContext so both screens share the same value ──
  const { userLocation, setUserLocation, radiusMiles, setRadiusMiles } =
    useLocation();

  // Local state for smooth dragging; syncs from context when other screen changes it
  const [localRadius, setLocalRadius] = useState<number>(radiusMiles);

  useEffect(() => {
    setLocalRadius(radiusMiles);
  }, [radiusMiles]);

  const params = useLocalSearchParams<{
    address?: string;
    lat?: string;
    lng?: string;
    radius?: string;
  }>();

  const places: Place[] = savedPlaces
    .filter((p) => p.location?.lat && p.location?.lng)
    .map((p) => ({
      id: p.id,
      title: p.name,
      description: p.location.address || p.category,
      coordinate: {
        latitude: p.location.lat,
        longitude: p.location.lng,
      },
    }));

  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [loadingAddress, setLoadingAddress] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [addressModalVisible, setAddressModalVisible] = useState<boolean>(false);
  const [addressInput, setAddressInput] = useState<string>("");
  const [pendingCoordinate, setPendingCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [newPlaceName, setNewPlaceName] = useState<string>("");
  const [newPlaceDesc, setNewPlaceDesc] = useState<string>("");
  const [sliderVisible, setSliderVisible] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const mapRef = useRef<any>(null);
  const paramsApplied = useRef(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (paramsApplied.current) return;
    if (!params.address && !params.lat) return;

    const radius = params.radius ? parseFloat(params.radius) : radiusMiles;
    setRadiusMiles(radius);
    setLocalRadius(radius);

    async function applyParams() {
      if (params.lat && params.lng) {
        const coords = {
          latitude: parseFloat(params.lat),
          longitude: parseFloat(params.lng),
        };
        setUserLocation(coords);
        setPendingCoordinate(coords);
        setModalVisible(true);
        setTimeout(() => {
          mapRef.current?.animateToRegion(
            { ...coords, ...milesToDelta(radius) },
            600
          );
        }, 500);
        paramsApplied.current = true;
        return;
      }

      if (params.address) {
        try {
          const results = await Location.geocodeAsync(params.address);
          if (results && results.length > 0) {
            const coords = {
              latitude: results[0].latitude,
              longitude: results[0].longitude,
            };
            setUserLocation(coords);
            setPendingCoordinate(coords);
            setModalVisible(true);
            setTimeout(() => {
              mapRef.current?.animateToRegion(
                { ...coords, ...milesToDelta(radius) },
                600
              );
            }, 500);
          }
        } catch {
          Alert.alert("Error", "Could not find that address on the map.");
        }
        paramsApplied.current = true;
      }
    }

    applyParams();
  }, [params, radiusMiles, setRadiusMiles, setUserLocation]);

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <Text>Map is not available on web</Text>
      </View>
    );
  }

  const MapView = require("react-native-maps").default;
  const { Polygon, Marker, Circle } = require("react-native-maps");

  const defaultCenter = { latitude: 40.7128, longitude: -74.006 };
  const mapCenter = userLocation || defaultCenter;

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

  const visiblePlaces = userLocation
    ? places.filter((p) =>
        getDistanceMiles(
          userLocation.latitude, userLocation.longitude,
          p.coordinate.latitude, p.coordinate.longitude
        ) <= localRadius
      )
    : places;

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
      mapRef.current?.animateToRegion(
        { ...coords, ...milesToDelta(localRadius) },
        600
      );
    } catch {
      Alert.alert("Error", "Could not get your location. Please try again.");
    } finally {
      setLoadingLocation(false);
    }
  }

  async function handleAddressSearch() {
    if (addressInput.trim().length === 0) {
      Alert.alert("Enter an address", "Please type an address first.");
      return;
    }
    setLoadingAddress(true);
    try {
      const results = await Location.geocodeAsync(addressInput.trim());
      if (!results || results.length === 0) {
        Alert.alert("Not found", "Could not find that address. Try being more specific.");
        return;
      }
      const coords = {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
      };
      setUserLocation(coords);
      setPendingCoordinate(coords);
      setNewPlaceName("");
      setNewPlaceDesc("");
      setAddressModalVisible(false);
      setAddressInput("");
      setModalVisible(true);
      mapRef.current?.animateToRegion(
        { ...coords, ...milesToDelta(localRadius) },
        600
      );
    } catch {
      Alert.alert("Error", "Could not look up that address. Please try again.");
    } finally {
      setLoadingAddress(false);
    }
  }

  function handleSavePlace() {
    if (!pendingCoordinate) return;
    if (newPlaceName.trim().length === 0) {
      Alert.alert("Name required", "Please enter a name for this place.");
      return;
    }
    setModalVisible(false);
    mapRef.current?.animateToRegion(
      { ...pendingCoordinate, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600
    );
  }

  // Smooth drag — only updates local display
  function handleSliderChange(val: number) {
    setLocalRadius(Math.round(val * 2) / 2);
  }

  // Finger lifted — write final value to shared context so other screen syncs
  function handleSlidingComplete(val: number) {
    const rounded = Math.round(val * 2) / 2;
    setRadiusMiles(rounded);
    mapRef.current?.animateToRegion(
      { ...mapCenter, ...milesToDelta(rounded) },
      300
    );
  }

  function handleSearch(text: string) {
    setQuery(text);

    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    if (text.trim().length === 0) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    const savedMatches = places.filter((p) =>
      p.title.toLowerCase().includes(text.toLowerCase())
    );
    setSuggestions(savedMatches);

    if (text.trim().length >= 3) {
      setSearchLoading(true);
      searchDebounce.current = setTimeout(async () => {
        try {
          const geoResults = await Location.geocodeAsync(text.trim());
          if (geoResults && geoResults.length > 0) {
            const geoPlaces: Place[] = await Promise.all(
              geoResults.slice(0, 4).map(async (r, i) => {
                let label = `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`;
                let sublabel = "Location";
                try {
                  const rev = await Location.reverseGeocodeAsync({
                    latitude: r.latitude,
                    longitude: r.longitude,
                  });
                  if (rev && rev.length > 0) {
                    const a = rev[0];
                    const street =
                      a.streetNumber && a.street
                        ? `${a.streetNumber} ${a.street}`
                        : a.street ?? "";
                    const city = a.city ?? a.subregion ?? "";
                    const region = a.region ?? "";
                    label = [street, city, region].filter(Boolean).join(", ");
                    sublabel = a.country ?? "Location";
                  }
                } catch {
                  // keep coord fallback
                }
                return {
                  id: `geo-${i}-${r.latitude}`,
                  title: label || text,
                  description: sublabel,
                  coordinate: { latitude: r.latitude, longitude: r.longitude },
                  isGeoResult: true,
                };
              })
            );

            setSuggestions((prev) => {
              const merged = [...prev];
              for (const geo of geoPlaces) {
                if (!merged.some((p) => p.title === geo.title)) {
                  merged.push(geo);
                }
              }
              return merged;
            });
          }
        } catch {
          // Silent fail — saved matches still show
        } finally {
          setSearchLoading(false);
        }
      }, 500);
    } else {
      setSearchLoading(false);
    }
  }

  function handleSelect(place: Place) {
    setQuery(place.title);
    setSuggestions([]);
    Keyboard.dismiss();

    if (place.isGeoResult) {
      setUserLocation(place.coordinate);
      mapRef.current?.animateToRegion(
        { ...place.coordinate, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        600
      );
    } else {
      setSelectedId(place.id);
      mapRef.current?.animateToRegion(
        { ...place.coordinate, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        600
      );
    }
  }

  function handleClear() {
    setQuery("");
    setSuggestions([]);
    setSelectedId(null);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    setSearchLoading(false);
    mapRef.current?.animateToRegion(
      { ...defaultCenter, latitudeDelta: 0.0922, longitudeDelta: 0.0421 },
      600
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        mapType="standard"
        initialRegion={{
          ...defaultCenter,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <Polygon
          coordinates={tristateArea}
          strokeColor="#FF0000"
          fillColor="rgba(255, 0, 0, 0.1)"
          strokeWidth={2}
        />

        {userLocation && (
          <Circle
            center={userLocation}
            radius={localRadius * 1609.34}
            strokeColor="rgba(0, 102, 255, 0.5)"
            fillColor="rgba(0, 102, 255, 0.08)"
            strokeWidth={2}
          />
        )}

        {userLocation && (
          <Marker
            coordinate={userLocation}
            pinColor="#0066FF"
            title="You are here"
          />
        )}

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
            placeholder="Search city, address, or place..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchLoading && (
            <ActivityIndicator
              size="small"
              color="#BFD7EA"
              style={{ marginRight: 4 }}
            />
          )}
          {query.length > 0 && !searchLoading && (
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {suggestions.length > 0 && (
          <FlatList<Place>
            style={styles.suggestions}
            data={suggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.suggestionTitle}>
                  {item.isGeoResult ? "📍 " : item.isUserAdded ? "⭐ " : ""}
                  {item.title}
                </Text>
                <Text style={styles.suggestionDesc}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {query.length > 0 && suggestions.length === 0 && !searchLoading && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No results found</Text>
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomPanel}>
        <TouchableOpacity
          style={styles.sliderToggle}
          onPress={() => setSliderVisible((v) => !v)}
        >
          <Text style={styles.sliderToggleText}>
            Travel Distance: {localRadius} miles
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
                value={localRadius}
                onValueChange={handleSliderChange}
                onSlidingComplete={handleSlidingComplete}
                minimumTrackTintColor="#BFD7EA"
                maximumTrackTintColor="#ddd"
                thumbTintColor="#BFD7EA"
              />
              <Text style={styles.sliderTick}>50 mi</Text>
            </View>
            <Text style={styles.sliderSubtext}>
              {userLocation
                ? `Showing ${visiblePlaces.length} place${visiblePlaces.length !== 1 ? "s" : ""} within ${localRadius} mi`
                : "Add your location to filter by distance"}
            </Text>
          </View>
        )}

        <View style={styles.locationRow}>
          <TouchableOpacity
            style={styles.addressBtn}
            onPress={() => setAddressModalVisible(true)}
          >
            <Text style={styles.locationBtnText}>Enter Address</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleAddCurrentLocation}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.locationBtnText}>Use My Location</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Address Entry Modal */}
      <Modal
        visible={addressModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setAddressModalVisible(false);
              setAddressInput("");
            }}
          />
          <View style={[styles.modalCard, { marginBottom: keyboardHeight }]}>
            <Text style={styles.modalTitle}>Enter Your Address</Text>
            <Text style={styles.modalSubtitle}>
              Type your address and we&apos;ll pin it on the map
            </Text>
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={styles.addressTextInput}
              placeholder="e.g. 123 Main St, New York, NY"
              placeholderTextColor="#aaa"
              value={addressInput}
              onChangeText={setAddressInput}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={handleAddressSearch}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setAddressModalVisible(false);
                  setAddressInput("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddressSearch}
                disabled={loadingAddress}
              >
                {loadingAddress ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Find on Map</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Save Place Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={Keyboard.dismiss}
          />
          <View style={[styles.modalCard, { marginBottom: keyboardHeight }]}>
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
              returnKeyType="next"
            />
            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Home base"
              placeholderTextColor="#aaa"
              value={newPlaceDesc}
              onChangeText={setNewPlaceDesc}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
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
  locationRow: {
    flexDirection: "row",
    gap: 10,
  },
  addressBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    gap: 6,
  },
  gpsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#BFD7EA",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    gap: 6,
  },
  locationBtnIcon: { color: "#000", fontSize: 16, fontWeight: "700" },
  locationBtnText: { color: "#000", fontSize: 14, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalDismiss: { flex: 1 },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 20,
  },
  modalCoords: { fontSize: 12, color: "#999", marginBottom: 20 },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
  },
  addressTextInput: {
    borderWidth: 1.5,
    borderColor: "#BFD7EA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#F9FBFD",
    marginBottom: 20,
  },
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

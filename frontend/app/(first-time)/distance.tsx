import React, { useState, useEffect } from "react";
import {
   StyleSheet,
   Text,
   TouchableOpacity,
   View,
   ActivityIndicator,
   Alert,
   Modal,
   TextInput,
   FlatList,
   Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import Slider from "@react-native-community/slider";
import AuthBackground from "@/components/AuthBackground";
import { useLocation } from "@/context/LocationContext";

export default function DistanceScreen() {
   const router = useRouter();
   const { userLocation, setUserLocation, radiusMiles, setRadiusMiles } =
      useLocation();

   const [loadingGPS, setLoadingGPS] = useState<boolean>(false);
   const [confirmedAddress, setConfirmedAddress] = useState<string>("");
   const [localRadius, setLocalRadius] = useState<number>(radiusMiles);

   // Search modal state
   const [searchModalVisible, setSearchModalVisible] = useState<boolean>(false);
   const [searchQuery, setSearchQuery] = useState<string>("");
   const [searchResults, setSearchResults] = useState<
      { label: string; latitude: number; longitude: number }[]
   >([]);
   const [searchLoading, setSearchLoading] = useState<boolean>(false);

   // Sync local slider when context changes (e.g map screen updated it)
   useEffect(() => {
      setLocalRadius(radiusMiles);
   }, [radiusMiles]);

   async function handleUseGPS() {
      setLoadingGPS(true);
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
         const reverse = await Location.reverseGeocodeAsync(coords);
         if (reverse && reverse.length > 0) {
            const r = reverse[0];
            const label = [r.streetNumber, r.street, r.city, r.region]
               .filter(Boolean)
               .join(", ");
            setConfirmedAddress(label || "Your GPS location");
         } else {
            setConfirmedAddress("Your GPS location");
         }
      } catch {
         Alert.alert("Error", "Could not get your location. Please try again.");
      } finally {
         setLoadingGPS(false);
      }
   }

   async function handleSearchAddress() {
      if (searchQuery.trim().length === 0) return;
      Keyboard.dismiss();
      setSearchLoading(true);
      setSearchResults([]);
      try {
         const results = await Location.geocodeAsync(searchQuery.trim());
         if (!results || results.length === 0) {
            Alert.alert(
               "Not found",
               "Could not find that location. Try being more specific.",
            );
            return;
         }
         const labeled = await Promise.all(
            results.slice(0, 5).map(async (r) => {
               let label = `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`;
               try {
                  const rev = await Location.reverseGeocodeAsync({
                     latitude: r.latitude,
                     longitude: r.longitude,
                  });
                  if (rev && rev.length > 0) {
                     const a = rev[0];
                     const parts = [a.streetNumber, a.street, a.city, a.region]
                        .filter(Boolean)
                        .join(", ");
                     if (parts) label = parts;
                  }
               } catch {
                  // keep coord fallback
               }
               return { label, latitude: r.latitude, longitude: r.longitude };
            }),
         );
         setSearchResults(labeled);
      } catch {
         Alert.alert(
            "Error",
            "Could not search that location. Please try again.",
         );
      } finally {
         setSearchLoading(false);
      }
   }

   function handleSelectResult(item: {
      label: string;
      latitude: number;
      longitude: number;
   }) {
      setUserLocation({ latitude: item.latitude, longitude: item.longitude });
      setConfirmedAddress(item.label);
      setSearchModalVisible(false);
      setSearchQuery("");
      setSearchResults([]);
   }

   function handleCloseSearch() {
      setSearchModalVisible(false);
      setSearchQuery("");
      setSearchResults([]);
      Keyboard.dismiss();
   }

   return (
      <AuthBackground variant="tl">
         <View style={styles.container}>
            <View style={styles.content}>
               <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.push("/(tabs)/explore")}
               >
                  <Text style={styles.backButtonText}>Back to Explore</Text>
               </TouchableOpacity>

               <View style={styles.card}>
                  <Text style={styles.title}>Set your travel distance</Text>
                  <Text style={styles.subtitle}>
                     Discover new places near you
                  </Text>

                  {/* GPS button */}
                  <TouchableOpacity
                     style={styles.gpsBtn}
                     onPress={handleUseGPS}
                     disabled={loadingGPS}
                  >
                     {loadingGPS ? (
                        <ActivityIndicator color="#000" size="small" />
                     ) : (
                        <Text style={styles.gpsBtnText}>
                           Use My Current Location
                        </Text>
                     )}
                  </TouchableOpacity>

                  {/* Confirmed location pill */}
                  {confirmedAddress ? (
                     <View style={styles.confirmedPill}>
                        <Text style={styles.confirmedIcon}>📍</Text>
                        <Text style={styles.confirmedText} numberOfLines={1}>
                           {confirmedAddress}
                        </Text>
                        <TouchableOpacity
                           onPress={() => {
                              setConfirmedAddress("");
                              setUserLocation(null);
                           }}
                        >
                           <Text style={styles.confirmedClear}>✕</Text>
                        </TouchableOpacity>
                     </View>
                  ) : null}

                  {/* Distance slider */}
                  <View style={styles.sliderCard}>
                     <View style={styles.sliderHeader}>
                        <Text style={styles.sliderLabel}>Travel Distance</Text>
                        <Text style={styles.sliderValue}>{localRadius} mi</Text>
                     </View>
                     <View style={styles.sliderRow}>
                        <Text style={styles.sliderTick}>0.5</Text>
                        <Slider
                           style={styles.slider}
                           minimumValue={0.5}
                           maximumValue={50}
                           step={0.5}
                           value={localRadius}
                           onValueChange={(v) =>
                              setLocalRadius(Math.round(v * 2) / 2)
                           }
                           onSlidingComplete={(v) =>
                              setRadiusMiles(Math.round(v * 2) / 2)
                           }
                           minimumTrackTintColor="#000"
                           maximumTrackTintColor="#ccc"
                           thumbTintColor="#000"
                        />
                        <Text style={styles.sliderTick}>50</Text>
                     </View>
                     <Text style={styles.sliderSubtext}>
                        Showing places within {localRadius} mile
                        {localRadius !== 1 ? "s" : ""}
                     </Text>
                  </View>

                  {/* Continue button */}
                  <TouchableOpacity
                     style={[
                        styles.continueBtn,
                        !userLocation && styles.continueBtnDisabled,
                     ]}
                     onPress={() => {
                        if (!userLocation) {
                           Alert.alert("No location set", "Use GPS first.");
                           return;
                        }
                        router.push("/travel");
                     }}
                  >
                     <Text
                        style={[
                           styles.continueBtnText,
                           !userLocation && { color: "#fff" },
                        ]}
                     >
                        Continue
                     </Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>

         {/* ── Search Location Modal ── */}
         <Modal
            visible={searchModalVisible}
            transparent
            animationType="slide"
            onRequestClose={handleCloseSearch}
         >
            <View style={styles.modalOverlay}>
               <TouchableOpacity
                  style={styles.modalDismiss}
                  activeOpacity={1}
                  onPress={handleCloseSearch}
               />
               <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Search a Location</Text>
                  <Text style={styles.modalSubtitle}>
                     Type a city, neighborhood, or address
                  </Text>

                  {/* Input + Go button */}
                  <View style={styles.inputRow}>
                     <TextInput
                        style={styles.searchInput}
                        placeholder="e.g. Brooklyn, NY"
                        placeholderTextColor="#aaa"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                        returnKeyType="search"
                        onSubmitEditing={handleSearchAddress}
                        autoCorrect={false}
                     />
                     <TouchableOpacity
                        style={styles.searchBtn}
                        onPress={handleSearchAddress}
                        disabled={searchLoading}
                     >
                        {searchLoading ? (
                           <ActivityIndicator color="#fff" size="small" />
                        ) : (
                           <Text style={styles.searchBtnText}>Go</Text>
                        )}
                     </TouchableOpacity>
                  </View>

                  {/* Results */}
                  {searchResults.length > 0 && (
                     <FlatList
                        data={searchResults}
                        keyExtractor={(_, i) => String(i)}
                        keyboardShouldPersistTaps="handled"
                        style={styles.resultsList}
                        renderItem={({ item }) => (
                           <TouchableOpacity
                              style={styles.resultItem}
                              onPress={() => handleSelectResult(item)}
                           >
                              <Text style={styles.resultIcon}>📍</Text>
                              <Text style={styles.resultLabel}>
                                 {item.label}
                              </Text>
                           </TouchableOpacity>
                        )}
                     />
                  )}

                  <TouchableOpacity
                     style={styles.cancelBtn}
                     onPress={handleCloseSearch}
                  >
                     <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
               </View>
            </View>
         </Modal>
      </AuthBackground>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1 },
   backButton: {
      position: "absolute",
      top: 60,
      left: 20,
      zIndex: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: "#000",
      borderRadius: 999,
   },
   backButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 13,
   },
   content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
   },
   card: {
      backgroundColor: "#fff",
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "#000",
      padding: 24,
      width: "100%",
   },
   title: {
      fontSize: 28,
      fontWeight: "800",
      color: "#000",
      marginBottom: 6,
      textAlign: "center",
   },
   subtitle: {
      fontSize: 14,
      color: "#000",
      marginBottom: 24,
      lineHeight: 20,
      textAlign: "center",
   },
   gpsBtn: {
      backgroundColor: "#fff",
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: "#000",
      paddingVertical: 13,
      alignItems: "center",
      marginBottom: 12,
   },
   gpsBtnText: {
      color: "#000",
      fontWeight: "700",
      fontSize: 15,
   },
   confirmedPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: "#000",
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
      gap: 8,
   },
   confirmedIcon: { fontSize: 14 },
   confirmedText: {
      flex: 1,
      fontSize: 13,
      color: "#000",
      fontWeight: "600",
   },
   confirmedClear: {
      fontSize: 13,
      color: "#000",
      paddingLeft: 4,
   },
   sliderCard: {
      backgroundColor: "#fff",
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: "#000",
      padding: 18,
      marginBottom: 16,
   },
   sliderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
   },
   sliderLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: "#000",
   },
   sliderValue: {
      fontSize: 15,
      fontWeight: "800",
      color: "#000",
      backgroundColor: "#fff",
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: "#000",
      overflow: "hidden",
   },
   sliderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
   },
   slider: { flex: 1, height: 40 },
   sliderTick: {
      fontSize: 11,
      color: "#000",
      width: 24,
      textAlign: "center",
      fontWeight: "600",
   },
   sliderSubtext: {
      textAlign: "center",
      fontSize: 12,
      color: "#000",
      marginTop: 4,
   },
   travelBtn: {
      backgroundColor: "#fff",
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: "#000",
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 12,
   },
   travelBtnText: {
      color: "#000",
      fontWeight: "700",
      fontSize: 15,
   },
   continueBtn: {
      backgroundColor: "#111",
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "#000",
   },
   continueBtnDisabled: {
      backgroundColor: "#111",
      borderColor: "#000",
   },
   continueBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.5,
   },

   // Modal
   modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
   },
   modalDismiss: { flex: 1 },
   modalCard: {
      backgroundColor: "#fff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
   },
   modalTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#000",
      marginBottom: 4,
   },
   modalSubtitle: {
      fontSize: 13,
      color: "#666",
      marginBottom: 20,
   },
   inputRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
   },
   searchInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: "#000",
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: "#000",
   },
   searchBtn: {
      backgroundColor: "#000",
      borderRadius: 12,
      paddingHorizontal: 20,
      justifyContent: "center",
      alignItems: "center",
   },
   searchBtnText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 15,
   },
   resultsList: {
      maxHeight: 220,
      marginBottom: 12,
   },
   resultItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",
      gap: 10,
   },
   resultIcon: { fontSize: 16 },
   resultLabel: {
      flex: 1,
      fontSize: 14,
      color: "#000",
      fontWeight: "600",
   },
   cancelBtn: {
      marginTop: 4,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: "#000",
      alignItems: "center",
   },
   cancelBtnText: {
      fontSize: 15,
      color: "#000",
      fontWeight: "700",
   },
});

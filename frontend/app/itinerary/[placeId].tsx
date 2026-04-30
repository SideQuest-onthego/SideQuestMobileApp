import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSavedPlaces } from "@/context/SavedPlacesContext";
import { formatCategoryLabel } from "@/services/placeDisplay";

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
   const { placeId } = useLocalSearchParams<{ placeId?: string }>(); // grabs placeId from POI
   const { savedPlaces } = useSavedPlaces();

   const selectedPlace = useMemo(
      // useMemo function to cache results, avoid API call
      () => savedPlaces.find((place) => place.id === placeId) ?? null, // returns POI info via placeId
      [placeId, savedPlaces],
   );

   if (!selectedPlace) {
      // if doesn't exist or function can't find POI
      return (
         <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Saved place not found</Text>
            <Text style={styles.emptyText}>
               This itinerary page is keyed by the saved POI id, but that place
               could not be loaded from your saved list.
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
      <ScrollView
         style={styles.container}
         contentContainerStyle={styles.content}
      >
         <Text style={styles.eyebrow}>Itinerary</Text>

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
                  {selectedPlace.location.address},{" "}
                  {selectedPlace.location.city}, {selectedPlace.location.state}
               </Text>
               <Text style={styles.meta}>
                  {formatCategoryLabel(
                     selectedPlace.category,
                     selectedPlace.type,
                  )}{" "}
                  •{" "}
                  {formatPrice(
                     selectedPlace.estimatedCost.min,
                     selectedPlace.estimatedCost.max,
                  )}
               </Text>
            </View>
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
      padding: 20,
      gap: 16,
   },
   eyebrow: {
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: "#46655F",
   },
   heroCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      borderWidth: 2,
      borderColor: "#102C26",
      padding: 14,
      gap: 14,
   },
   heroImage: {
      width: "100%",
      height: 220,
      borderRadius: 14,
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
      fontSize: 28,
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

import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import type { ActivityModel } from "../types/sidequest-models";
import { useSavedPlaces } from "../context/SavedPlacesContext";
import { MAX_ITINERARY_PLACES } from "@/services/itineraryEngine";
import { Ionicons } from "@expo/vector-icons";

type SavedPlaceCardProps = {
  item: ActivityModel;
  onRemove?: (id: string) => void;
  onPress?: (item: ActivityModel) => void;
  onAddToItinerary?: (item: ActivityModel) => void;
};

function formatPrice(min: number, max: number) {
  if (min === 0 && max === 0) return "Free";
  if (min === max) return `$${min}`;
  return `$${min}-$${max}`;
}

export default function SavedPlaceCard({
  item,
  onRemove,
  onPress,
  onAddToItinerary,
}: SavedPlaceCardProps) {
  const { itineraryPlaces } = useSavedPlaces();

  const isAdded = itineraryPlaces.some((p) => p.id === item.id);
  const isItineraryFull = itineraryPlaces.length >= MAX_ITINERARY_PLACES;

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(item)}>
      {/* Left: Image */}
      <View style={styles.imageContainer}>
        {item.links?.imageUrl ? (
          <Image
            source={{ uri: item.links.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>No Image</Text>
          </View>
        )}
      </View>

      {/* Middle: Info */}
      <View style={styles.infoContainer}>
        <View>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.description} numberOfLines={1}>
            {item.location.city}, {item.location.state}
          </Text>
          <Text style={styles.metaText}>
            {formatPrice(item.estimatedCost.min, item.estimatedCost.max)}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {/* Add to Itinerary button */}
          {!isAdded && !isItineraryFull && (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                onAddToItinerary?.(item);
              }}
              style={styles.addButton}
            >
              <Text style={styles.addText}>Add To Itinerary</Text>
            </Pressable>
          )}
          {!isAdded && isItineraryFull && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>Itinerary full</Text>
            </View>
          )}
          {/* Remove button */}
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onRemove?.(item.id);
            }}
            style={styles.removeButton}
          >
            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000000",
    borderRadius: 28,
    padding: 16,
    alignItems: "center",

    width: "92%",
    alignSelf: "center",

    marginBottom: 14,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginRight: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },

  imagePlaceholderText: {
    color: "#888",
    fontSize: 12,
  },

  infoContainer: {
    flex: 1,
    justifyContent: "space-between",
  },

  title: {
    fontSize: 16,
    fontWeight: "600",
  },

  description: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },

  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,0,0,0.6)",
  },

  removeText: {
    color: "#fff",
    fontWeight: "600",
  },

  addButton: {
    backgroundColor: "#102C26",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  addText: {
    color: "#fff",
    fontWeight: "600",
  },

  fullBadge: {
    backgroundColor: "#D8E2DC",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  fullBadgeText: {
    color: "#102C26",
    fontWeight: "600",
  },
  metaText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#102C26",
    marginTop: 6,
  },
});

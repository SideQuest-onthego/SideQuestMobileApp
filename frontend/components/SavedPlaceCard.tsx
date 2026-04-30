import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import type { ActivityModel } from "../types/sidequest-models";
import { useSavedPlaces } from "../context/SavedPlacesContext";

type SavedPlaceCardProps = {
  item: ActivityModel;
  onRemove?: (id: string) => void;
  onPress?: (item: ActivityModel) => void;
  onAddToItinerary?: (item: ActivityModel) => void;
};

export default function SavedPlaceCard({
  item,
  onRemove,
  onPress,
  onAddToItinerary,
}: SavedPlaceCardProps) {

  const { itineraryPlaces } = useSavedPlaces();

  const isAdded = itineraryPlaces.some(p => p.id === item.id);

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(item)}>
      {/* Left: Image */}
      {item.links?.imageUrl ? (
        <Image source={{ uri: item.links.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>No Image</Text>
        </View>
      )}

      {/* Middle: Info */}
      <View style={styles.infoContainer}>
        <View>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.description}>
            {item.location.address}, {item.location.city}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>

          {/* Add to Itinerary button */}
          {!isAdded && (
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
          {/* Remove button */}
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onRemove?.(item.id);
            }}
            style={styles.removeButton}
          >
            <Text style={styles.removeText}>Remove</Text>
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
  borderRadius: 12,
  padding: 16,

  
  width: "92%",
  alignSelf: "center",

  marginBottom: 14,

  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},

  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
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
    backgroundColor: "#000",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  removeText: {
    color: "#fff",
    fontWeight: "600",
  },

  addButton: {
    backgroundColor: "#000",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  addText: {
    color: "#fff",
    fontWeight: "600",
  },
});
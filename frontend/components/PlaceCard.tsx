import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import type { ActivityModel } from "../types/sidequest-models";

type PlaceCardProps = {
  item: ActivityModel;
  showRemove?: boolean;
  onRemove?: (id: string) => void;
};

export default function PlaceCard({ item, showRemove, onRemove }: PlaceCardProps) {
  return (
    <View style={styles.card}>
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
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.description}>
            {item.location.address}, {item.location.city}
          </Text>
        </View>

        {/* Bottom right: Remove button */}
        {showRemove && (
          <Pressable onPress={() => onRemove?.(item.id)} style={styles.removeButton}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,           // thicker black border like Account cards
    borderColor: "#000000",
    borderRadius: 12,         
    padding: 16,              // same padding as Account cards
    marginBottom: 14,         // gap modeled after Account cards
    marginTop: 24,            // first card offset from top
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
  textContainer: {},
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  removeButton: {
    backgroundColor: "#000",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-end",
    marginTop: 8,
  },
  removeText: {
    color: "#fff",
    fontWeight: "600",
  },
});
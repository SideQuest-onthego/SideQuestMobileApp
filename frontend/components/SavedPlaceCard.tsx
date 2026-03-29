import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import type { ActivityModel } from "../types/sidequest-models";

type SavedPlaceCardProps = {
  item: ActivityModel;
  onRemove?: (id: string) => void;
  onPress?: (item: ActivityModel) => void;
};

export default function SavedPlaceCard({
  item,
  onRemove,
  onPress,
}: SavedPlaceCardProps) {
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
    marginBottom: 14,
    marginTop: 24,
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

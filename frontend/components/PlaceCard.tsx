// frontend/components/PlaceCard.tsx
import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import type { ActivityModel } from "../types/sidequest-models";
import { useSavedPlaces } from "../app/SavedPlacesContext";

// Format estimated cost safely as a string
function formatPrice(item: ActivityModel) {
  const { min, max } = item.estimatedCost ?? { min: 0, max: 0 };
  if (min === 0 && max === 0) return "Free";
  if (min === max) return `$${min}`;
  return `$${min} - $${max}`;
}

export default function PlaceCard({
  item,
  showRemove = false,
}: {
  item: ActivityModel;
  showRemove?: boolean;
}) {
  const { removePlace } = useSavedPlaces();

  // Defensive: ensure all strings are valid
  const name = String(item.name ?? "Untitled");
  const category = String(item.category ?? ""); // always a string
  const city = String(item.location?.city ?? "Unknown");
  const state = String(item.location?.state ?? "Unknown");
  const imageUrl = String(item.links?.imageUrl ?? "https://picsum.photos/seed/sidequest/800/500");
  const id = String(item.id ?? crypto.randomUUID());

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
          {name}
        </Text>

        {/* Image */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <View>
            <Text style={styles.price}>{formatPrice(item)}</Text>
            <Text style={styles.location}>{`${city}, ${state}`}</Text>
          </View>

          {/* Only render category if it has a value */}
          {category.length > 0 && <Text style={styles.category}>{category}</Text>}
        </View>

        {/* Remove button */}
        {showRemove && id && (
          <TouchableOpacity style={styles.removeButton} onPress={() => removePlace(id)}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", marginVertical: 6 },
  card: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  imageWrapper: { width: "100%", height: 250, borderRadius: 16, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  price: { fontSize: 16, fontWeight: "600" },
  location: { fontSize: 14, color: "#555" },
  category: { fontWeight: "700", fontSize: 14 },
  removeButton: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f55",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  removeText: { color: "#fff", fontWeight: "bold" },
});
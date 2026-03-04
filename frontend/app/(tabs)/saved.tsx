import React from "react";
import { View, Text, FlatList, StyleSheet, Image } from "react-native";
import { useSavedPlaces } from "../SavedPlacesContext";

export default function SavedPlaces() {
  // Get saved places from context
  const { savedPlaces } = useSavedPlaces();

  // Render each saved place
  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {item.links?.imageUrl && <Image source={{ uri: item.links.imageUrl }} style={styles.image} />}
      <Text style={styles.name}>{item.name}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={savedPlaces}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text>No saved places yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  card: { marginBottom: 12, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#ccc", padding: 8 },
  image: { width: "100%", height: 150, borderRadius: 12 },
  name: { fontSize: 16, fontWeight: "700", marginTop: 8 },
});
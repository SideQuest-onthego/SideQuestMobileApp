// frontend/app/(tabs)/saved.tsx
import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, Text } from "react-native";
import { useSavedPlaces } from "../SavedPlacesContext";
import PlaceCard from "../../components/PlaceCard";

export default function SavedScreen() {
  const { savedPlaces, removePlace } = useSavedPlaces();

  // Force FlatList re-render when savedPlaces updates
  const [renderTrigger, setRenderTrigger] = useState(0);
  useEffect(() => setRenderTrigger(prev => prev + 1), [savedPlaces]);

  return (
    <View style={styles.container}>
      {savedPlaces.length === 0 ? (
        <Text style={styles.emptyText}>You haven't saved any places yet.</Text>
      ) : (
        <FlatList
          data={savedPlaces}
          keyExtractor={(item) => item.id}
          extraData={renderTrigger} // ensures re-render
          renderItem={({ item }) => (
            <PlaceCard
              item={item}
              showRemove
              onRemove={(id) => removePlace(id)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#CFDAF1",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#555",
  },
  listContent: {
    paddingBottom: 20,
  },
});
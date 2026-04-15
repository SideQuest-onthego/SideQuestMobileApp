// frontend/app/(tabs)/saved.tsx
import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useSavedPlaces } from "../../context/SavedPlacesContext";
import SavedPlaceCard from "../../components/SavedPlaceCard";

export default function SavedScreen() {
  const router = useRouter();
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
            <SavedPlaceCard
              item={item}
              onRemove={removePlace}
              onPress={(place) =>
                router.push({
                  pathname: "/itinerary/[placeId]",
                  params: { placeId: place.id },
                })
              }
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
    backgroundColor: "#DBFEF7",
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

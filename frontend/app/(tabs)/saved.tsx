import React from "react";
import { View, FlatList, StyleSheet, Text } from "react-native";
import { useSavedPlaces } from "../../context/SavedPlacesContext";
import SavedPlaceCard from "../../components/SavedPlaceCard";

export default function SavedScreen() {
  const { savedPlaces, removePlace } = useSavedPlaces();

  return (
    <View style={styles.container}>
      {savedPlaces.length === 0 ? (
        <Text style={styles.emptyText}>You haven't saved any places yet.</Text>
      ) : (
        <FlatList
          data={savedPlaces}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SavedPlaceCard item={item} onRemove={removePlace} />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />} // smaller spacing
          ListHeaderComponent={<View style={{ height: 60 }} />} // push cards lower
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DBFEF7", // updated background
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#555",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
});
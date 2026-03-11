// frontend/app/(tabs)/saved.tsx

import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, Text } from "react-native";
import { useSavedPlaces } from "../SavedPlacesContext";
import PlaceCard from "../../components/PlaceCard";

export default function SavedScreen() {
  // Get the savedPlaces array from the global SavedPlacesContext
  const { savedPlaces } = useSavedPlaces();

  // State used to force the FlatList to re-render when savedPlaces changes
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Force re-render whenever savedPlaces changes
  useEffect(() => {
    setRenderTrigger((prev) => prev + 1);
  }, [savedPlaces]);

  return (
    <View style={styles.container}>
      {savedPlaces.length === 0 ? (
        <Text>No saved places yet</Text>
      ) : (
        <FlatList
          data={savedPlaces} // data source for the list
          keyExtractor={(item) => String(item.id)} // unique key
          extraData={renderTrigger} // force re-render when trigger changes
          renderItem={({ item }) => (
            <PlaceCard
              item={item} // pass the place data
              showRemove // enable remove button
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // take full screen height
    padding: 12, // spacing around content
    backgroundColor: "#CFDAF1", // light blue
  },
});
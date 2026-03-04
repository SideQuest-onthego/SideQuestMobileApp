import React from "react";
import { View } from "react-native";
import SwipeDeck from "../components/SwipeDeck";
import { places } from "../data/places";
import { useLocalSearchParams } from "expo-router";
import { useSavedPlaces } from "./SavedPlacesContext";

export default function SwipeScreen() {
  // Get budget passed from previous screen (URL param)
  const { budget } = useLocalSearchParams();
  // Convert budget to number (default to 0 if undefined)
  const numericBudget = Number(budget ?? 0);
   // Get savePlace function from context
  const { savePlace } = useSavedPlaces();
   // Filter places so only ones within budget appear
  const filteredPlaces = places.filter((place) => place.estimatedCost.min <= numericBudget);

  return (
    <View style={{ flex: 1 }}>
      <SwipeDeck
        data={filteredPlaces} // send filtered data
        onSwipeRight={(place) => savePlace(place)} // save if swiped right
      />
    </View>
  );
}
import React from "react";
import { View } from "react-native";
import SwipeDeck from "../components/SwipeDeck";
import { places } from "../data/places";
import { useLocalSearchParams } from "expo-router";
import { useSavedPlaces } from "./SavedPlacesContext";

export default function SwipeScreen() {
  // Get budget passed from previous screen (URL param)
  const { budget } = useLocalSearchParams();
  const numericBudget = Number(budget);


  const priceToNumber = (price: string) => {
    if (price.toLowerCase() === "free") return 0;
    if (price.includes("-")) {
      // take the lower end of the range
      return Number(price.split("-")[0].replace("$", ""));
    }
    return Number(price.replace("$", ""));
  };

 
  const filteredPlaces = places.filter((place) => {
    return priceToNumber(place.price) <= numericBudget;
  });

  return (
    <View style={{ flex: 1 }}>
      <SwipeDeck
        data={filteredPlaces} // send filtered data
        onSwipeRight={(place) => savePlace(place)} // save if swiped right
      />
    </View>
  );
}
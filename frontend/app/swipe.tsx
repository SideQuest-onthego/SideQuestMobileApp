import React from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import SwipeDeck from "../components/SwipeDeck";
import { places } from "../data/places";

type Place = (typeof places)[number];

//Returns the minimum estimated cost of a place
//So a range like 17-30 would return 17
function getPlaceCost(place: Place): number {
  return place.estimatedCost?.min ?? 0;
}

export default function SwipeScreen() {
  //Read the budget from the router parameters
  const { budget } = useLocalSearchParams();
  //Convert the budget to a number (0 if it's missing or invalid)
  const numericBudget = Number(budget) || 0;
  //Filter the places to only include those that are within the user's budget
  //Starting from the minimum cost of the place
  const filteredPlaces = places.filter(
    (place) => getPlaceCost(place) <= numericBudget,
  );

  //Render the SwipeDeck using only the filtered list of places
  return (
    <View style={{ flex: 1 }}>
      <SwipeDeck data={filteredPlaces} />
    </View>
  );
}

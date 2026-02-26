import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import SwipeDeck from "../components/SwipeDeck";
import { places } from "../data/places";

export default function SwipeScreen() {
  const { budget } = useLocalSearchParams();

  // Convert budget safely to a number
  const numericBudget = Number(budget ?? 0);

  // Filter places using structured estimatedCost data
  const filteredPlaces = places.filter((place) => {
    return place.estimatedCost.min <= numericBudget;
  });

  return (
    <View style={{ flex: 1 }}>
      <SwipeDeck data={filteredPlaces} />
    </View>
  );
}
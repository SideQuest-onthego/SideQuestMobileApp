import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import SwipeDeck from "../components/SwipeDeck";
import { places } from "../data/places";

export default function SwipeScreen() {
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
      <SwipeDeck data={filteredPlaces} />
    </View>
  );
}
import React from "react";
import { StyleSheet, View } from "react-native";
import SwipeDeck from "../../components/SwipeDeck";
import { places } from "../../data/places";

export default function HomeScreen() {
   return (
      <View style={styles.container}>
         <SwipeDeck data={places} />
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#CFDAF1",
   },
});

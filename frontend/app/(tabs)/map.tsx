import React from "react";
import { StyleSheet, View, Platform, Text } from "react-native";

export default function MapScreen() {
  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <Text>Map is not available on web</Text>
      </View>
    );
  }

  const MapView = require("react-native-maps").default;
  const { Polygon } = require("react-native-maps");

  const location = {
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }; 
 
  const tristateArea = [
    { latitude: 41.3628, longitude: -74.6944 }, // NJ northwest
    { latitude: 41.3573, longitude: -73.5543 }, // NY/CT border
    { latitude: 41.1765, longitude: -72.8182 }, // CT south
    { latitude: 40.9176, longitude: -72.0049 }, // Long Island east
    { latitude: 40.5174, longitude: -74.2591 }, // Staten Island south
    { latitude: 39.4957, longitude: -74.9170 }, // NJ south
    { latitude: 40.0757, longitude: -75.1997 }, // NJ west
    { latitude: 41.3628, longitude: -74.6944 }, // back to start
  ]; 

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        mapType="standard"
        initialRegion={location}
      >
        <Polygon
          coordinates={tristateArea}
          strokeColor="#FF0000"
          fillColor="rgba(255, 0, 0, 0.1)"
          strokeWidth={2}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
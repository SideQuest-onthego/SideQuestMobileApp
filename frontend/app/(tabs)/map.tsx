import React from "react";
import { StyleSheet, View, Platform, Text } from "react-native";

const SAVED_PLACES = [
  {
    id: 1,
    title: "Statue of Liberty",
    description: "Iconic national monument",
    coordinate: { latitude: 40.6892, longitude: -74.0445 },
  },
  {
    id: 2,
    title: "Museum of Natural History",
    description: "World-famous natural history museum",
    coordinate: { latitude: 40.7813, longitude: -73.9740 },
  },
  {
    id: 3,
    title: "Central Park",
    description: "843-acre urban park",
    coordinate: { latitude: 40.7851, longitude: -73.9683 },
  },
  {
    id: 4,
    title: "Brooklyn Bridge",
    description: "Historic suspension bridge",
    coordinate: { latitude: 40.7061, longitude: -73.9969 },
  },
  {
    id: 5,
    title: "Empire State Building",
    description: "Iconic Art Deco skyscraper",
    coordinate: { latitude: 40.7484, longitude: -73.9857 },
  },
  {
    id: 6,
    title: "Times Square",
    description: "The crossroads of the world",
    coordinate: { latitude: 40.7580, longitude: -73.9855 },
  },
  {
    id: 7,
    title: "The High Line",
    description: "Elevated linear park",
    coordinate: { latitude: 40.7480, longitude: -74.0048 },
  },
];

export default function MapScreen() {
  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <Text>Map is not available on web</Text>
      </View>
    );
  }

  const MapView = require("react-native-maps").default;
  const { Polygon, Marker, Callout } = require("react-native-maps");

  const location = {
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const tristateArea = [
    { latitude: 41.3628, longitude: -74.6944 },
    { latitude: 41.3573, longitude: -73.5543 },
    { latitude: 41.1765, longitude: -72.8182 },
    { latitude: 40.9176, longitude: -72.0049 },
    { latitude: 40.5174, longitude: -74.2591 },
    { latitude: 39.4957, longitude: -74.9170 },
    { latitude: 40.0757, longitude: -75.1997 },
    { latitude: 41.3628, longitude: -74.6944 },
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

        {SAVED_PLACES.map((place) => (
          <Marker
            key={place.id}
            coordinate={place.coordinate}
            pinColor="#FF0000"
            title={place.title}
            description={place.description}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
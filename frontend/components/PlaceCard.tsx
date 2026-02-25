import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { Place } from "../data/places";

export default function PlaceCard({ item }: { item: Place }) {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text
          style={styles.title}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {item.title}
        </Text>

        <View style={styles.imageWrap}>
          <Image
            source={{ uri: item.image }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        <View style={styles.infoRow}>
          <View>
            <Text style={styles.price}>{item.price}</Text>
            {item.location && (
              <Text style={styles.location}>{item.location}</Text>
            )}
          </View>

          {item.distance && (
            <Text style={styles.distance}>{item.distance}</Text>
          )}
        </View>

        <View style={styles.buttonRow}>
          <Text style={styles.button}>Dislike</Text>
          <Text style={styles.button}>Like</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    width: "90%",
    borderRadius: 28,
    padding: 16,
    borderWidth: 2,
    borderColor: "black",
  },

  imageWrap: {
    width: "100%",
    height: 380,
    borderRadius: 24,
    overflow: "hidden",
  },

  title: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: "800",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  price: {
    fontSize: 18,
    fontWeight: "700",
  },

  location: {
    fontSize: 14,
    opacity: 0.7,
  },

  distance: {
    fontWeight: "700",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  button: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 12,
    fontWeight: "800",
  },
});

import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { Place } from "../data/places";

export default function PlaceCard({ item }: { item: Place }) {
  return (
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

      <Text style={styles.price}>{item.price}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#CFDAF1",
    width: "100%",
    alignItems: "center",
    paddingTop: 30,
    paddingHorizontal: 16,
  },

  title: {
    color: "#0F672C",
    fontSize: 34,
    letterSpacing: 3,
    fontWeight: "700",
    textAlign: "center",
    width: "95%",
    lineHeight: 38,
  },

  imageWrap: {
    width: 377,
    height: 503,
    borderRadius: 60,
    overflow: "hidden",
    backgroundColor: "#C9D5EA",
    marginTop: 30,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  price: {
    color: "#3F81C4",
    fontSize: 34,
    letterSpacing: 3,
    fontWeight: "700",
  },
});

import React from "react";
import { Image, StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ActivityModel } from "../types/sidequest-models";
import { formatCategoryLabel } from "../services/placeDisplay";

type PlaceCardProps = {
  item: ActivityModel;
  showRemove?: boolean;
  onRemove?: (id: string) => void;
  onDislike?: () => void;
  onLike?: () => void;
};

function formatPrice(item: ActivityModel) {
  const { min, max } = item.estimatedCost;
  if (min === 0 && max === 0) return "Free";
  if (min === max) return `$${min}`;
  return `$${min}-$${max}`;
}

export default function PlaceCard({
  item,
  showRemove,
  onRemove,
  onDislike,
  onLike,
}: PlaceCardProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text
          style={styles.title}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {item.name}
        </Text>

        <View style={styles.imageWrap}>
          <Image
            source={{
              uri:
                item.links?.imageUrl ??
                "https://picsum.photos/seed/sidequest/800/500",
            }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        <View style={styles.infoRow}>
          <View>
            <Text style={styles.price}>{formatPrice(item)}</Text>
            {item.location && (
              <Text style={styles.location}>
                {item.location.city}, {item.location.state}
              </Text>
            )}
          </View>
          {item.category && (
            <Text style={styles.category}>
              {formatCategoryLabel(item.category, item.type)}
            </Text>
          )}
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.iconButton, styles.dislikeButton]}
            onPress={onDislike}
          >
            <Ionicons name="close" size={34} color="rgb(220,0,0)" />
          </Pressable>

          <Pressable
            style={[styles.iconButton, styles.likeButton]}
            onPress={onLike}
          >
            <Ionicons name="heart" size={32} color="rgb(0,160,0)" />
          </Pressable>

          {showRemove && onRemove && (
            <Pressable
              style={[styles.button, { borderColor: "black" }]}
              onPress={() => onRemove(item.id)}
            >
              <Text
                style={{
                  color: "black",
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
                Remove
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: "white",
    width: "90%",
    borderRadius: 28,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgb(0,0,0)",
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

  category: {
    fontWeight: "700",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  iconButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  dislikeButton: {
    borderColor: "rgb(220,0,0)",
    backgroundColor: "rgba(220,0,0,0.06)",
  },

  likeButton: {
    borderColor: "rgb(0,160,0)",
    backgroundColor: "rgba(0,160,0,0.06)",
  },

  arrowText: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: "800",
    color: "black",
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

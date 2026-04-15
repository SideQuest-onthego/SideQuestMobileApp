// frontend/components/SwipeDeck.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ActivityModel } from "../types/sidequest-models";
import PlaceCard from "./PlaceCard";
import { useSavedPlaces } from "../context/SavedPlacesContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 180;

type Props = {
  data: ActivityModel[];
  onSwipeLeft?: (item: ActivityModel) => void;
  onNearEnd?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
};

export default function SwipeDeck({
  data,
  onSwipeLeft,
  onNearEnd,
  hasMore = false,
  isLoadingMore = false,
}: Props) {
  const [index, setIndex] = useState(0);
  const [hasPlayedHint, setHasPlayedHint] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const lastNearEndIndex = useRef<number | null>(null);

  const { addPlace } = useSavedPlaces();

  useEffect(() => {
    if (index === 0 && !hasPlayedHint) {
      Animated.sequence([
        Animated.delay(350),

        // move slightly to the right
        Animated.timing(pan.x, {
          toValue: 70,
          duration: 460,
          useNativeDriver: false,
        }),

        // then move slightly to the left
        Animated.timing(pan.x, {
          toValue: -75,
          duration: 520,
          useNativeDriver: false,
        }),

        // return to center
        Animated.spring(pan.x, {
          toValue: 0,
          useNativeDriver: false,
          friction: 6,
          tension: 70,
        }),
      ]).start(() => {
        setHasPlayedHint(true);
      });
    }
  }, [index, hasPlayedHint, pan.x]);

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const bgOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [0.6, 0, 0.6],
    extrapolate: "clamp",
  });

  const bgColor = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: ["rgba(255,0,0,1)", "rgba(0,0,0,1)", "rgba(0,200,0,1)"],
    extrapolate: "clamp",
  });

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,

    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
      useNativeDriver: false,
    }),

    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD) forceSwipe("right");
      else if (g.dx < -SWIPE_THRESHOLD) forceSwipe("left");
      else resetPosition();
    },
  });

  function forceSwipe(dir: "left" | "right") {
    const x = dir === "right" ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(pan, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(dir));
  }

  function onSwipeComplete(dir: "left" | "right") {
    const item = data[index];
    if (!item) return;

    if (dir === "right") {
      addPlace(item);
    } else {
      onSwipeLeft?.(item);
    }

    pan.setValue({ x: 0, y: 0 });
    setIndex((prev) => prev + 1);
  }

  function resetPosition() {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 5,
    }).start();
  }

  useEffect(() => {
    if (
      !hasMore ||
      isLoadingMore ||
      !onNearEnd ||
      data.length === 0 ||
      index < Math.max(data.length - 3, 0) ||
      lastNearEndIndex.current === index
    ) {
      return;
    }

    lastNearEndIndex.current = index;
    onNearEnd();
  }, [data.length, hasMore, index, isLoadingMore, onNearEnd]);

  if (index >= data.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.endScreen}>Looks like you have seen it all</Text>
      </View>
    );
  }

  const current = data[index];

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: bgColor, opacity: bgOpacity },
        ]}
      />

      <Animated.View
        style={[
          styles.cardLayer,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { rotate },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[styles.badge, styles.likeBadge, { opacity: likeOpacity }]}
        >
          <Text style={styles.badgeText}>LIKE</Text>
        </Animated.View>

        <Animated.View
          style={[styles.badge, styles.nopeBadge, { opacity: nopeOpacity }]}
        >
          <Text style={styles.badgeText}>NOPE</Text>
        </Animated.View>

        <PlaceCard
          item={current}
          onDislike={() => forceSwipe("left")}
          onLike={() => forceSwipe("right")}
        />
      </Animated.View>
      {isLoadingMore ? (
        <View style={styles.loadingMoreWrap} pointerEvents="none">
          <Text style={styles.loadingMoreText}>Loading more places...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#dbfef7",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  endScreen: {
    color: "black",
    fontSize: 20,
    fontWeight: "700",
  },

  cardLayer: {
    width: "100%",
    height: "100%",
  },

  tutorialOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },

  badge: {
    position: "absolute",
    top: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 3,
    zIndex: 50,
  },

  likeBadge: {
    left: 30,
    borderColor: "rgba(0,160,0,1)",
    backgroundColor: "rgba(0,160,0,0.12)",
    transform: [{ rotate: "-12deg" }],
  },

  nopeBadge: {
    right: 30,
    borderColor: "rgba(220,0,0,1)",
    backgroundColor: "rgba(220,0,0,0.12)",
    transform: [{ rotate: "12deg" }],
  },

  badgeText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
  },

  loadingMoreWrap: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },

  loadingMoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: "black",
  },
});

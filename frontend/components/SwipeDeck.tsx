import React, { useRef, useState } from "react";
import { Animated, Dimensions, PanResponder, StyleSheet, Text, View } from "react-native";
import type { ActivityModel } from "../types/sidequest-models";
import PlaceCard from "./PlaceCard";

// Props expected from parent
type Props = {
  data: ActivityModel[];
  onSwipeLeft?: (item: ActivityModel) => void;
  onSwipeRight?: (item: ActivityModel) => void;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH; // Minimum swipe distance
const SWIPE_OUT_DURATION = 180;

export default function SwipeDeck({ data, onSwipeLeft, onSwipeRight }: Props) {
  const [index, setIndex] = useState(0); // Current card index
  const [showTutorial, setShowTutorial] = useState(true);
  const pan = useRef(new Animated.ValueXY()).current; // Animated position of card

  // Rotate card slightly while swiping
  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  // Handles touch gestures
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      setShowTutorial(false);
      if (g.dx > SWIPE_THRESHOLD) forceSwipe("right");
      else if (g.dx < -SWIPE_THRESHOLD) forceSwipe("left");
      else resetPosition();
    },
  });

  // Animate card off screen
  const forceSwipe = (dir: "left" | "right") => {
    const x = dir === "right" ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(pan, { toValue: { x, y: 0 }, duration: SWIPE_OUT_DURATION, useNativeDriver: false }).start(() => onSwipeComplete(dir));
  };

  // After swipe finishes
  const onSwipeComplete = (dir: "left" | "right") => {
    const item = data[index];
    if (item) {
      dir === "right" ? onSwipeRight?.(item) : onSwipeLeft?.(item);
    }
    pan.setValue({ x: 0, y: 0 });
    setIndex((prev) => prev + 1);
  };

  const resetPosition = () => {
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 5 }).start();
  };

  // If no more cards
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
      {showTutorial && (
        <View style={styles.tutorialOverlay} pointerEvents="none">
          <View style={styles.tutorialCard}>
            <Text style={styles.tutorialTitle}>Quick tip</Text>
            <Text style={styles.tutorialText}>Swipe left to pass ⟵</Text>
            <Text style={styles.tutorialText}>Swipe right to save ⟶</Text>
          </View>
        </View>
      )}
      <Animated.View
        style={[styles.cardLayer, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
        {...panResponder.panHandlers}
      >
        <PlaceCard item={current} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#CFDAF1", flex: 1, alignItems: "center", justifyContent: "center" },
  endScreen: { color: "black", fontSize: 20, fontWeight: "700" },
  cardLayer: { width: "100%", height: "100%" },
  tutorialOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 100 },
  tutorialCard: { backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 25, paddingVertical: 16, paddingHorizontal: 18, width: "80%" },
  tutorialTitle: { fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  tutorialText: { fontSize: 16, fontWeight: "600", textAlign: "center", marginTop: 6 },
});
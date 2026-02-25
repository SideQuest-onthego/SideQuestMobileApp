import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Place } from "../data/places";
import PlaceCard from "./PlaceCard";

type Props = {
  data: Place[];
  onSwipeLeft?: (item: Place) => void;
  onSwipeRight?: (item: Place) => void;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 180;

export default function SwipeDeck({ data, onSwipeLeft, onSwipeRight }: Props) {
  const [index, setIndex] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  const pan = useRef(new Animated.ValueXY()).current;

  //The card rotates slightly as it is being dragged
  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH], //left, center, right
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      //Swipe is activated after the card has been mooved by at least 5 pixels in either direction
      Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,

    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
      useNativeDriver: false,
    }),

    onPanResponderRelease: (_, g) => {
      //The tutorial message dissapears after the first swipe
      setShowTutorial(false);
      //Depending on the distance the card has been dragged,
      //we either intiate a swipe or reset the card to its original position
      if (g.dx > SWIPE_THRESHOLD) forceSwipe("right");
      else if (g.dx < -SWIPE_THRESHOLD) forceSwipe("left");
      else resetPosition();
    },
  });

  //Animates the card out of the screen depeding on the direction of the swipe
  //Then calls the onSwipeComplete function to move on to the next card or show the end screen
  function forceSwipe(dir: "left" | "right") {
    const x = dir === "right" ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(pan, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(dir));
  }

  function onSwipeComplete(dir: "left" | "right") {
    //The card that has just been swiped
    const item = data[index];
    //Make sure the item exists
    if (item) {
      //Checking the direction of the swipe (useful for the future SAVED LIST feature)
      if (dir === "right") onSwipeRight?.(item);
      else onSwipeLeft?.(item);
    }

    //Reset the position of the card and move on to the next one
    pan.setValue({ x: 0, y: 0 });
    setIndex((prev) => prev + 1);
  }
  //If the card is not swiped far enough, it goes back to its original position
  function resetPosition() {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      //Increase to make the card snap back faster and vice versa
      friction: 5,
    }).start();
  }

  //If there is no more card left to show, display a message
  if (index >= data.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.endScreen}>Looks like you have seen it all</Text>
      </View>
    );
  }

  const current = data[index];

  //Putting it all together
  return (
    <View style={styles.container}>
      {showTutorial && (
        //The tutorial message
        <View style={styles.tutorialOverlay} pointerEvents="none">
          <View style={styles.tutorialCard}>
            <Text style={styles.tutorialTitle}>Quick tip</Text>
            <Text style={styles.tutorialText}>Swipe left to pass ⟵</Text>
            <Text style={styles.tutorialText}>Swipe right to save ⟶</Text>
          </View>
        </View>
      )}
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
        <PlaceCard item={current} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#CFDAF1",
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

  tutorialCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 18,
    width: "80%",
  },

  tutorialTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },

  tutorialText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
  },
});

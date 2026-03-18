import React, { ReactNode } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

type AuthBackgroundProps = {
  children: ReactNode;
};

export default function AuthBackground({ children }: AuthBackgroundProps) {
  const { width, height } = useWindowDimensions();

  // Defining the path data for the top-left wave
  // The wave adjusts based on the screen dimensions to maintain a consistent look across devices
  const pathData = `
    M 0 0
    L ${width} 0
    C ${width * 0.72} ${height * 0.14} ${width * 0.83} ${height * 0.28} ${width * 0.58} ${height * 0.44}
    C ${width * 0.39} ${height * 0.56} ${width * 0.25} ${height * 0.52} 0 ${height * 0.8}
    L 0 ${height}
    L 0 0
    Z
  `;

  return (
    <View style={styles.screen}>
      {/*Setting up the background gradient using SVG*/}
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <Defs>
          {/*Defining the top-left gradient*/}
          <LinearGradient
            id="tl"
            x1="0"
            y1="0"
            x2={width}
            y2={height * 0.3}
            gradientUnits="userSpaceOnUse"
          >
            {/*Defining the colors for the gradient*/}
            <Stop offset="0%" stopColor="#5a8bff" />
            <Stop offset="100%" stopColor="#a5ffc9" />
          </LinearGradient>
        </Defs>

        {/*Drawing top-left wave */}
        <Path d={pathData} fill="url(#tl)" opacity="0.95" />
      </Svg>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
});

import React, { ReactNode } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

type AuthBackgroundProps = {
  children: ReactNode;
  variant?: "tl" | "br";
};

export default function AuthBackground({
  children,
  variant = "tl",
}: AuthBackgroundProps) {
  const { width, height } = useWindowDimensions();

  //Top-left curve
  const topLeftPath = `
    M 0 0
    L ${width} 0
    C ${width * 0.72} ${height * 0.14} ${width * 0.83} ${height * 0.28} ${width * 0.58} ${height * 0.44}
    C ${width * 0.39} ${height * 0.56} ${width * 0.25} ${height * 0.52} 0 ${height * 0.8}
    L 0 ${height}
    L 0 0
    Z
  `;

  //Bottom-right = inverse of top-left
  const bottomRightPath = `
    M 0 0
    H ${width}
    V ${height}
    H 0
    Z

    ${topLeftPath}
  `;

  const isTopLeft = variant === "tl";

  return (
    <View style={styles.screen}>
      {/* SVG background curve */}
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <Defs>
          {/* Gradient for the background curve */}
          <LinearGradient
            id="grad"
            x1={isTopLeft ? 0 : width}
            y1={isTopLeft ? 0 : height}
            x2={width * 0.5}
            y2={height * 0.5}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#5a8bff" />
            <Stop offset="100%" stopColor="#a5ffc9" />
          </LinearGradient>
        </Defs>

        {/* Render the appropriate background curve based on the variant */}
        {isTopLeft ? (
          <Path d={topLeftPath} fill="url(#grad)" opacity="0.95" />
        ) : (
          // Bottom-right curve is the inverse of top-left, so we can reuse the same path with a different fill
          <Path
            d={bottomRightPath}
            fill="url(#grad)"
            fillRule="evenodd"
            opacity="0.95"
          />
        )}
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

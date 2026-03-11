import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";

const { width, height } = Dimensions.get("window");

export function BackgroundOrbs() {
  return (
    <View pointerEvents="none" style={styles.container}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="orb1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FF6C24" stopOpacity="0.50" />
            <Stop offset="25%" stopColor="#FF6C24" stopOpacity="0.30" />
            <Stop offset="60%" stopColor="#FF6C24" stopOpacity="0.10" />
            <Stop offset="100%" stopColor="#FF6C24" stopOpacity="0" />
          </RadialGradient>

          <RadialGradient id="orb2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFAC7D" stopOpacity="0.38" />
            <Stop offset="25%" stopColor="#FFAC7D" stopOpacity="0.22" />
            <Stop offset="60%" stopColor="#FFAC7D" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#FFAC7D" stopOpacity="0" />
          </RadialGradient>

          <RadialGradient id="orb3" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FF8540" stopOpacity="0.22" />
            <Stop offset="25%" stopColor="#FF8540" stopOpacity="0.12" />
            <Stop offset="60%" stopColor="#FF8540" stopOpacity="0.04" />
            <Stop offset="100%" stopColor="#FF8540" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* top right */}
        <Circle cx={width - 40} cy={40} r={360} fill="url(#orb1)" />

        {/* bottom left */}
        <Circle cx={40} cy={height - 180} r={300} fill="url(#orb2)" />

        {/* center */}
        <Circle cx={width / 2} cy={height / 2} r={400} fill="url(#orb3)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
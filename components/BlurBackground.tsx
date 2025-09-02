import React, { useRef } from "react";
import { Canvas, BlurMask, Group } from "@shopify/react-native-skia";
import { Dimensions, StyleSheet } from "react-native";
import BlurCircle from "./BlurCircle";

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

const BlurBackground: React.FC = () => {
  const r = useRef(WINDOW_WIDTH / 2.5).current;
  const circles = useRef(new Array(6).fill(1)).current;
  const step = WINDOW_HEIGHT / circles.length;

  return (
    <Canvas style={styles.background}>
      <Group>
        <BlurMask blur={60} style="normal" />
        {circles.map((_, index) => (
          <BlurCircle
            key={index}
            cx={index % 2 ? WINDOW_WIDTH : 0}
            cy={step * index}
            r={r}
            delay={index * 1000}
          />
        ))}
      </Group>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default BlurBackground;
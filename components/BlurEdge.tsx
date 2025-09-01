import React from "react";
import { Canvas, LinearGradient, Rect, vec } from "@shopify/react-native-skia";
import { Dimensions, StyleProp, ViewStyle } from "react-native";

const { width: WINDOW_WIDTH } = Dimensions.get('window');

interface BlurEdgeProps {
  enabled?: boolean;
  height: number;
  colors: string[];
  style?: StyleProp<ViewStyle>;
}

const BlurEdge: React.FC<BlurEdgeProps> = ({
  enabled = true,
  height,
  colors,
  style
}) => {
  if (!enabled) {
    return null;
  }

  return (
    <Canvas style={[style, { height }]}>
      <Rect x={0} y={0} width={WINDOW_WIDTH} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={colors}
        />
      </Rect>
    </Canvas>
  );
};

export default BlurEdge;
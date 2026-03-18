import React from 'react';
import {
  Canvas,
  Fill,
  Shader,
  Skia,
  useClock,
} from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

const waterShaderSource = Skia.RuntimeEffect.Make(`
const float TAU = 6.28318530718;
const int MAX_ITER = 5;

uniform float2 resolution;
uniform float time;

half4 main(float2 fragCoord) {
  float localTime = time * 0.5 + 23.0;
  float2 uv = fragCoord / resolution.xy;
  float2 p = mod(uv * TAU, TAU) - 250.0;
  float2 i = p;
  float c = 1.0;
  float inten = 0.005;

  for (int n = 0; n < MAX_ITER; n++) {
    float stepTime = localTime * (1.0 - (3.5 / float(n + 1)));
    i = p + float2(
      cos(stepTime - i.x) + sin(stepTime + i.y),
      sin(stepTime - i.y) + cos(stepTime + i.x)
    );

    c += 1.0 / length(float2(
      p.x / (sin(i.x + stepTime) / inten),
      p.y / (cos(i.y + stepTime) / inten)
    ));
  }

  c /= float(MAX_ITER);
  c = 1.17 - pow(c, 1.4);

  float3 colour = float3(pow(abs(c), 8.0));
  colour = clamp(colour + float3(0.0, 0.35, 0.5), 0.0, 1.0);

  return half4(colour, 1.0);
}
`);

if (!waterShaderSource) {
  throw new Error('Failed to compile water shader.');
}

const causticsShaderSource = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float time;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(float2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

float waterCaustics(float2 uv, float t) {
  float2 p = uv * 5.0;

  p.x += sin(p.y * 1.5 + t * 0.3) * 0.5;
  p.y += cos(p.x * 1.3 - t * 0.25) * 0.5;

  float c1 = sin(p.x * 2.0 + t * 0.4) * cos(p.y * 2.0 - t * 0.3);
  float c2 = sin(p.x * 3.0 - t * 0.5) * sin(p.y * 2.5 + t * 0.4);
  float c3 = cos(p.x * 1.5 + p.y * 1.5 + t * 0.2);

  float caustic = (c1 + c2 + c3) * 0.333;
  caustic = abs(caustic);
  caustic = pow(caustic, 0.3);
  caustic = 1.0 - caustic;
  caustic = pow(caustic, 8.0);

  return caustic;
}

float advancedCaustics(float2 uv, float t) {
  float2 p = uv * 6.0;
  float tt = t * 0.2;

  p += float2(sin(tt + p.y * 1.5) * 0.4, cos(tt + p.x * 1.3) * 0.4);

  float wave1 = sin(p.x * 1.5 + tt * 2.0);
  float wave2 = sin(p.y * 1.3 - tt * 1.8);
  float wave3 = sin((p.x - p.y) * 1.2 + tt * 1.5);
  float wave4 = sin((p.x + p.y) * 1.4 - tt * 1.7);

  float pattern = (wave1 * wave2 + wave3 * wave4) * 0.5;
  pattern = abs(pattern);
  pattern = smoothstep(0.82, 0.98, pattern);

  return pattern;
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / resolution.xy;
  float2 centeredUV = (fragCoord - 0.5 * resolution.xy) / resolution.y;
  float t = time;

  float3 waterDark = float3(0.05, 0.25, 0.3);
  float3 waterBase = float3(0.1, 0.4, 0.45);
  float3 waterLight = float3(0.2, 0.55, 0.6);

  float gradient = length(centeredUV) * 0.5;
  float3 waterColor = mix(waterLight, waterBase, gradient);
  waterColor = mix(waterColor, waterDark, gradient * gradient);

  float causticPattern = advancedCaustics(centeredUV, t);
  causticPattern += waterCaustics(centeredUV * 0.8, t * 1.2) * 0.5;
  causticPattern += advancedCaustics(centeredUV * 1.3, t * 0.8) * 0.3;

  float3 causticColor = float3(0.8, 0.95, 1.0);
  waterColor += causticColor * causticPattern * 1.2;

  float turbulence = fbm(centeredUV * 8.0 + t * 0.1 + uv * 0.5);
  waterColor *= 0.85 + turbulence * 0.15;

  float ripple = sin(centeredUV.x * 15.0 + t) * cos(centeredUV.y * 15.0 - t);
  waterColor += float3(0.1, 0.15, 0.2) * ripple * 0.05;

  waterColor = pow(waterColor, float3(0.95));
  waterColor = clamp(waterColor, 0.0, 1.0);

  return half4(waterColor, 1.0);
}
`);

if (!causticsShaderSource) {
  throw new Error('Failed to compile caustics shader.');
}

type Props = {
  opacity?: number;
  variant?: 'turbulence' | 'caustics';
};

export default function WaterShaderBackground({
  opacity = 1,
  variant = 'turbulence',
}: Props) {
  const { width, height } = useWindowDimensions();
  const clock = useClock();
  const source = variant === 'caustics' ? causticsShaderSource : waterShaderSource;

  const uniforms = useDerivedValue(() => {
    return {
      resolution: [width, height],
      time: clock.value / 1000,
    };
  }, [clock, height, width]);

  return (
    <View pointerEvents="none" style={[styles.wrapper, { opacity }]}>
      <Canvas style={styles.canvas}>
        <Fill>
          <Shader source={source} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  canvas: {
    flex: 1,
  },
});

import React from 'react';
import { Text, TextProps } from 'react-native';

type Props = TextProps & {
  text: string;
  maxLines?: number;
  maxFontSize?: number;
  minFontSize?: number;
  step?: number;
  allowScale?: boolean; // default false to keep layout stable
};

export default function AutoFitText({
  text,
  style,
  maxLines = 6,
  maxFontSize = 22,
  minFontSize = 12,
  step = 1,
  allowScale = false,
  ...rest
}: Props) {
  const [fontSize, setFontSize] = React.useState(maxFontSize);
  const [locked, setLocked] = React.useState(false); // stop adjusting once it fits or we hit min

  // Reset when text changes
  React.useEffect(() => {
    setFontSize(maxFontSize);
    setLocked(false);
  }, [text, maxFontSize]);

  return (
    <Text
      {...rest}
      // keep it within a fixed line budget; no layout creep
      numberOfLines={maxLines}
      ellipsizeMode="tail"
      allowFontScaling={allowScale}
      onTextLayout={(e) => {
        if (locked) return;
        const lines = e.nativeEvent.lines?.length ?? 0;
        if (lines > maxLines && fontSize > minFontSize) {
          setFontSize((f) => Math.max(minFontSize, f - step));
        } else {
          setLocked(true);
        }
      }}
      style={[
        // @ts-ignore - RN styles accept number for fontSize
        { fontSize },
        style,
      ]}
    >
      {text}
    </Text>
  );
}

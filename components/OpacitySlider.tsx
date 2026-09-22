import { Slider } from '@expo/ui/community/slider';

type Props = {
  /** 0..1 */
  value: number;
  onValueChange: (next: number) => void;
  accent: string;
  inactiveTrackColor?: string;
  thumbColor?: string;
};

/** Web / fallback — community slider (native input range on web). */
export function OpacitySlider({ value, onValueChange, accent, inactiveTrackColor, thumbColor }: Props) {
  return (
    <Slider
      style={{ width: '100%' }}
      value={Math.round(value * 100)}
      minimumValue={0}
      maximumValue={100}
      step={1}
      minimumTrackTintColor={accent}
      maximumTrackTintColor={inactiveTrackColor}
      thumbTintColor={thumbColor}
      onValueChange={(v) => onValueChange(v / 100)}
    />
  );
}

import { Host, Slider } from '@expo/ui/jetpack-compose';

type Props = {
  /** 0..1 */
  value: number;
  onValueChange: (next: number) => void;
  accent: string;
  inactiveTrackColor?: string;
  thumbColor?: string;
};

/**
 * Android Host slider — real Material3 Slider inside a Host.
 * Styling escape hatch vs community: full `colors` object
 * (active/inactive track + thumb), plus steps.
 */
export function OpacitySlider({ value, onValueChange, accent, inactiveTrackColor, thumbColor }: Props) {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <Slider
        value={Math.round(value * 100)}
        min={0}
        max={100}
        steps={99}
        colors={{
          activeTrackColor: accent,
          inactiveTrackColor,
          thumbColor,
          activeTickColor: accent,
          inactiveTickColor: inactiveTrackColor,
        }}
        onValueChange={(v) => onValueChange(v / 100)}
      />
    </Host>
  );
}

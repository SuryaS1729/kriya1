import { Host, Slider } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';

type Props = {
  /** 0..1 */
  value: number;
  onValueChange: (next: number) => void;
  accent: string;
};

/**
 * iOS Host slider — real SwiftUI Slider inside a Host.
 * Styling escape hatch vs community: `tint()` modifier for the active track.
 */
export function OpacitySlider({ value, onValueChange, accent }: Props) {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <Slider
        value={Math.round(value * 100)}
        min={0}
        max={100}
        step={1}
        modifiers={[tint(accent)]}
        onValueChange={(v) => onValueChange(v / 100)}
      />
    </Host>
  );
}

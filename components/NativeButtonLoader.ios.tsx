import { Host, ProgressView } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';

type Props = {
  color?: string;
};

/** iOS native loader — SwiftUI ProgressView (indeterminate) inside a Host. */
export function NativeButtonLoader({ color }: Props) {
  return (
    <Host matchContents>
      <ProgressView modifiers={color ? [tint(color)] : undefined} />
    </Host>
  );
}

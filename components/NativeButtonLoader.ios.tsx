import { Host, ProgressView } from '@expo/ui/swift-ui';

type Props = {
  color?: string;
};

/** iOS native loader — SwiftUI ProgressView (indeterminate) inside a Host. */
export function NativeButtonLoader({ color }: Props) {
  void color;
  return (
    <Host style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <ProgressView />
    </Host>
  );
}

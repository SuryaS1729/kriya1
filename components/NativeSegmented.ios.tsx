import { View } from 'react-native';
import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { environment, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

type Props = {
  values: string[];
  selectedIndex: number;
  onValueChange: (index: number) => void;
  dark?: boolean;
  /** Fixed pill width — keeps the row compact and centered. */
  width?: number;
};

/** iOS native segmented row — SwiftUI Picker with segmented style inside a Host. */
export function NativeSegmented({ values, selectedIndex, onValueChange, dark, width = 250 }: Props) {
  // The SwiftUI picker otherwise follows the *device* color scheme, which makes
  // unselected labels render dark on the app's dark panel (#00151a). Force the
  // scheme to match the app theme so both selected and idle labels stay legible.
  const modifiers = [pickerStyle('segmented')];
  if (dark !== undefined) {
    modifiers.push(environment('colorScheme', dark ? 'dark' : 'light'));
  }

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Host matchContents={{ vertical: true }} style={{ width, alignSelf: 'center' }}>
        <Picker
          selection={selectedIndex}
          onSelectionChange={(v: number) => onValueChange(v)}
          modifiers={modifiers}
        >
          {values.map((label, index) => (
            <Text key={label} modifiers={[tag(index)]}>
              {label}
            </Text>
          ))}
        </Picker>
      </Host>
    </View>
  );
}

import { View } from 'react-native';
import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

type Props = {
  values: string[];
  selectedIndex: number;
  onValueChange: (index: number) => void;
  dark?: boolean;
  /** Fixed pill width — keeps the row compact and centered. */
  width?: number;
};

/** iOS native segmented row — SwiftUI Picker with segmented style inside a Host. */
export function NativeSegmented({ values, selectedIndex, onValueChange, width = 250 }: Props) {
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Host matchContents={{ vertical: true }} style={{ width, alignSelf: 'center' }}>
        <Picker
          selection={selectedIndex}
          onSelectionChange={(v: number) => onValueChange(v)}
          modifiers={[pickerStyle('segmented')]}
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

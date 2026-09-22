import { View } from 'react-native';
import { Host, SingleChoiceSegmentedButtonRow, SegmentedButton, Text } from '@expo/ui/jetpack-compose';

type Props = {
  values: string[];
  selectedIndex: number;
  onValueChange: (index: number) => void;
  dark?: boolean;
  /** Fixed pill width — keeps the row compact and centered. */
  width?: number;
};

/** Android native segmented row — Material3 SegmentedButton inside a Host. */
export function NativeSegmented({ values, selectedIndex, onValueChange, dark, width = 250 }: Props) {
  const colors = dark
    ? {
        activeContainerColor: '#33484f',
        activeContentColor: '#e8eef0',
        activeBorderColor: '#33484f',
        inactiveContainerColor: '#16262b',
        inactiveContentColor: '#9db4b8',
        inactiveBorderColor: '#202f36',
      }
    : {
        activeContainerColor: '#dbe4ec',
        activeContentColor: '#1f2937',
        activeBorderColor: '#dbe4ec',
        inactiveContainerColor: '#ffffff',
        inactiveContentColor: '#75879a',
        inactiveBorderColor: '#e2e8f0',
      };
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Host style={{ width, alignSelf: 'center' }} matchContents={{ vertical: true }}>
        <SingleChoiceSegmentedButtonRow>
          {values.map((label, index) => (
            <SegmentedButton
              key={label}
              selected={index === selectedIndex}
              onClick={() => onValueChange(index)}
              colors={colors}
            >
              <SegmentedButton.Label>
                <Text>{label}</Text>
              </SegmentedButton.Label>
            </SegmentedButton>
          ))}
        </SingleChoiceSegmentedButtonRow>
      </Host>
    </View>
  );
}

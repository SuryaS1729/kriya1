import { View } from 'react-native';
import { SegmentedControl } from '@expo/ui/community/segmented-control';

type Props = {
  values: string[];
  selectedIndex: number;
  onValueChange: (index: number) => void;
  dark?: boolean;
  /** Fixed pill width — keeps the row compact and centered. */
  width?: number;
};

/** Web / fallback segmented row. */
export function NativeSegmented({ values, selectedIndex, onValueChange, dark, width = 250 }: Props) {
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <SegmentedControl
        values={values}
        selectedIndex={selectedIndex}
        onValueChange={(v) => onValueChange(values.indexOf(v))}
        appearance={dark ? 'dark' : 'light'}
        style={{ width }}
      />
    </View>
  );
}

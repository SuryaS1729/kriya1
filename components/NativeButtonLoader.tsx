import { ActivityIndicator } from 'react-native';

type Props = {
  color?: string;
};

/** Web / fallback loader. */
export function NativeButtonLoader({ color }: Props) {
  return <ActivityIndicator size="small" color={color} />;
}

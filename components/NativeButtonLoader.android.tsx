import { ActivityIndicator } from 'react-native';

type Props = {
  color?: string;
};

/** Android loader — plain spinner (Material expressive loader felt too blobby). */
export function NativeButtonLoader({ color }: Props) {
  return <ActivityIndicator size="small" color={color} />;
}

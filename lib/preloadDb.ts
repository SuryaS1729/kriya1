import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

type EnsureOpts = { forceReplace?: boolean };

export async function ensureDatabasePresent(
  dbName: string,
  assetModule: number,       // e.g. require('../assets/db/gita.db')
  opts: EnsureOpts = {}
) {
  const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
  const dest = `${sqliteDir}/${dbName}`;

  await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true }).catch(() => {});

  // Optional reset while debugging
  if (opts.forceReplace) {
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
  }

  const exists = (await FileSystem.getInfoAsync(dest)).exists;
  if (!exists) {
    const asset = Asset.fromModule(assetModule);
    await asset.downloadAsync(); // ensures asset.localUri is set
    if (!asset.localUri) throw new Error('DB asset localUri missing');
    await FileSystem.copyAsync({ from: asset.localUri, to: dest });

    const info = await FileSystem.getInfoAsync(dest);
    console.log('DB copied to', dest, 'size:', info.size);
  } else {
    const info = await FileSystem.getInfoAsync(dest);
    console.log('DB already present at', dest, 'size:', info.size);
  }
}

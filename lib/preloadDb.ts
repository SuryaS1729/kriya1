import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

/**
 * Ensure `gita.db` exists under the device's SQLite directory.
 * If missing, copy the bundled asset there on first run.
 * Returns the absolute path of the on-device DB.
 */
export async function ensureDatabasePresent(
  dbName = 'gita.db',
  assetModule = require('../assets/db/gita.db')
): Promise<string> {
  const sqliteDir = FileSystem.documentDirectory + 'SQLite/';
  const dbPath = sqliteDir + dbName;

  // If already copied, we're done.
  const stat = await FileSystem.getInfoAsync(dbPath);
  if (stat.exists) return dbPath;

  // Make the SQLite dir and copy the bundled DB into it.
  await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });

  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();                 // make sure it’s available locally
  if (!asset.localUri) throw new Error('Failed to resolve bundled DB asset path');

  await FileSystem.copyAsync({ from: asset.localUri, to: dbPath });
  return dbPath;
}

import * as SQLite from 'expo-sqlite';

// Open the same file we ensured in Step 2
export const db = SQLite.openDatabaseSync('gita.db');

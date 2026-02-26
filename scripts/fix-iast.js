#!/usr/bin/env node
// scripts/fix-iast.js
// Fix IAST transliteration in gita.db so TTS pronounces names correctly.
// This updates translation_2, description, and commentary columns.
//
// Usage: node scripts/fix-iast.js
//
// Creates a backup at assets/db/gita.db.bak before modifying.

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '..', 'assets', 'db', 'gita.db');
const backupPath = dbPath + '.bak';

// Backup first
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log('✓ Created backup at assets/db/gita.db.bak');
} else {
  console.log('ℹ Backup already exists');
}

// IAST → phonetic English replacements
// Order matters: longer/more specific patterns first to avoid partial replacements
const REPLACEMENTS = [
  // Names with -acarya suffix
  ['Dronacarya', 'Dronacharya'],
  ['Shankaracarya', 'Shankaracharya'],
  ['Yamunacarya', 'Yamunacharya'],
  ['Kripacarya', 'Kripacharya'],
  ['Ramanujacarya', 'Ramanujacharya'],
  ['Sukracarya', 'Sukracharya'],
  ['Madhvacarya', 'Madhvacharya'],
  ['namacarya', 'namacharya'],
  ['Acarya', 'Acharya'],
  ['acarya', 'acharya'],

  // Major names
  ['Dhrtarastra', 'Dhritarashtra'],
  ['Hrsikesa', 'Hrishikesha'],
  ['Krsna', 'Krishna'],
  ['Acyuta', 'Achyuta'],
  ['acyuta', 'achyuta'],
  ['Bhisma', 'Bhishma'],
  ['Visnu', 'Vishnu'],

  // Brahma compounds (be careful not to replace Brahma itself)
  ['brahmacarya', 'brahmacharya'],
  ['Brahmacarya', 'Brahmacharya'],
  ['brahmacari', 'brahmachari'],
  ['Brahmacari', 'Brahmachari'],

  // Other terms
  ['devarsi', 'devarishi'],
  ['Sastra', 'Shastra'],
  ['sastra', 'shastra'],
  ['Santi', 'Shanti'],
  ['santi', 'shanti'],
  ['sankara', 'shankara'],
];

const db = new Database(dbPath);

const columns = ['translation_2', 'description', 'commentary'];
let totalReplacements = 0;

for (const [iast, phonetic] of REPLACEMENTS) {
  for (const col of columns) {
    const result = db.prepare(`
      UPDATE shlokas
      SET ${col} = REPLACE(${col}, ?, ?)
      WHERE ${col} LIKE ?
    `).run(iast, phonetic, `%${iast}%`);

    if (result.changes > 0) {
      console.log(`  ${iast} → ${phonetic} in ${col}: ${result.changes} rows`);
      totalReplacements += result.changes;
    }
  }
}

db.close();
console.log(`\n✅ Done! ${totalReplacements} total replacements made.`);
console.log('Backup saved at: assets/db/gita.db.bak');

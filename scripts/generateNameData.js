/**
 * isimler.txt ve soyiisimler.txt dosyalarını okuyup
 * src/utils/nameData.js dosyasını üretir.
 *
 * Kullanım: node scripts/generateNameData.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

// ── Türkçe Title Case ──────────────────────────────────────────────────────────
function trTitleCase(str) {
  // Önce Türkçe lowercase (İ→i, I→ı, diğerleri JS .toLowerCase() ile)
  const lower = str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase();

  // Her kelimenin ilk harfini Türkçe büyüt
  return lower.replace(/(?:^|\s)\S/g, (ch) => {
    if (ch === 'i') return 'İ';
    if (ch === 'ı') return 'I';
    return ch.toUpperCase();
  });
}

// ── isimler.txt oku ────────────────────────────────────────────────────────────
const isimlerRaw = readFileSync(join(root, 'isimler.txt'), 'utf-8');
const firstNames = new Set();

for (const line of isimlerRaw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  // Bileşik isimleri (MANSUR KÜRŞAD) her kelimeyi ayrı ayrı ekle
  for (const word of trimmed.split(/\s+/)) {
    if (word) firstNames.add(trTitleCase(word));
  }
}

// ── soyiisimler.txt oku (SQL format) ──────────────────────────────────────────
const soyisimlerRaw = readFileSync(join(root, 'soyiisimler.txt'), 'utf-8');
const surnames = new Set();

for (const line of soyisimlerRaw.split(/\r?\n/)) {
  // INSERT INTO soyisimler VALUES ('ABAT');
  const match = line.match(/VALUES\s*\('([^']+)'\)/i);
  if (match) {
    const word = match[1].trim();
    if (word) surnames.add(trTitleCase(word));
  }
}

// ── nameData.js yaz ───────────────────────────────────────────────────────────
const firstNamesArr = [...firstNames].sort();
const surnamesArr   = [...surnames].sort();

const output = `// Bu dosya otomatik üretilmiştir — scripts/generateNameData.js
// İsim sayısı : ${firstNamesArr.length}
// Soyisim sayısı: ${surnamesArr.length}

export const FIRST_NAMES = new Set(${JSON.stringify(firstNamesArr, null, 2)});

export const SURNAMES = new Set(${JSON.stringify(surnamesArr, null, 2)});
`;

writeFileSync(join(root, 'src/utils/nameData.js'), output, 'utf-8');

console.log(`✓ ${firstNamesArr.length} isim, ${surnamesArr.length} soyisim → src/utils/nameData.js`);

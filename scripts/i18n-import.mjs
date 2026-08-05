#!/usr/bin/env node
/**
 * i18n-import — convert `legacy/src/l10n/*.ini` (webL10n format) into JSON
 * message files at `src/lib/i18n/messages/*.json`. Idempotent; safe to
 * re-run whenever we sync a translation contribution back from v1.
 *
 * The parser used here mirrors `src/lib/i18n/parse-ini.ts` but is inlined
 * so this script has zero build dependencies (plain Node ESM).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const SRC_DIR = path.join(REPO, 'legacy/src/l10n');
const OUT_DIR = path.join(REPO, 'src/lib/i18n/messages');

// Mirror of LOCALES in src/lib/i18n/locales.ts. Keep in sync.
const LOCALES = [
  { code: 'en', file: '_english.ini' },
  { code: 'ca', file: 'catalan.ini' },
  { code: 'da', file: 'danish.ini' },
  { code: 'de', file: 'german.ini' },
  { code: 'el', file: 'greek.ini' },
  { code: 'es', file: 'spanish.ini' },
  { code: 'fil', file: 'filipino.ini' },
  { code: 'fr', file: 'french.ini' },
  { code: 'id', file: 'indonesian.ini' },
  { code: 'it', file: 'italian.ini' },
  { code: 'ja', file: 'japanese.ini' },
  { code: 'nb', file: 'norwegian.ini' },
  { code: 'nl', file: 'dutch.ini' },
  { code: 'pl', file: 'polish.ini' },
  { code: 'pt', file: 'portuguese.ini' },
  { code: 'pt-BR', file: 'portuguese-br.ini' },
  { code: 'ro', file: 'romanian.ini' },
  { code: 'ru', file: 'russian.ini' },
  { code: 'sv', file: 'swedish.ini' },
  { code: 'tr', file: 'turkish.ini' },
  { code: 'uk', file: 'ukrainian.ini' },
  { code: 'vi', file: 'vietnamese.ini' },
  { code: 'zh-Hans', file: 'chinese-simplified.ini' },
  { code: 'zh-Hant', file: 'chinese-traditional.ini' }
];

function parseIni(source) {
  const messages = {};
  let locale = '';
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      locale = line.slice(1, -1);
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const rawKey = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();
    if (!rawKey) continue;
    const isHtml = rawKey.endsWith('.innerHTML');
    const key = isHtml ? rawKey.slice(0, -'.innerHTML'.length) : rawKey;
    messages[key] = isHtml ? { value, isHtml: true } : { value, isHtml: false };
  }
  return { locale, messages };
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const available = new Set(readdirSync(SRC_DIR));
  let wrote = 0;
  for (const { code, file } of LOCALES) {
    if (!available.has(file)) {
      console.warn(`skip ${code}: missing ${file}`);
      continue;
    }
    const source = readFileSync(path.join(SRC_DIR, file), 'utf8');
    const parsed = parseIni(source);
    const out = path.join(OUT_DIR, `${code}.json`);
    writeFileSync(out, JSON.stringify({ code, messages: parsed.messages }, null, 2) + '\n', 'utf8');
    wrote += 1;
  }
  console.log(`Wrote ${wrote} locale JSON files to ${path.relative(REPO, OUT_DIR)}`);
}

main();

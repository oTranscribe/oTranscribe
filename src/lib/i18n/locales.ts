/**
 * Registry of every locale we ported from v1. Filename maps to the source INI
 * in `legacy/src/l10n/`; `code` is the BCP-47-ish tag we use everywhere in
 * v2. `label` is the endonym shown in the language picker so translators can
 * find their language without knowing English.
 *
 * Order roughly follows v1's picker order (alphabetical, English first).
 * The two non-standard files (`pirate.inix`, `qqq.ini` metadata dump) are
 * intentionally excluded — they are development artifacts.
 */

export interface Locale {
  code: string;
  label: string;
  file: string;
}

export const LOCALES: readonly Locale[] = [
  { code: 'en', label: 'English', file: '_english.ini' },
  { code: 'ca', label: 'Català', file: 'catalan.ini' },
  { code: 'da', label: 'Dansk', file: 'danish.ini' },
  { code: 'de', label: 'Deutsch', file: 'german.ini' },
  { code: 'el', label: 'Ελληνικά', file: 'greek.ini' },
  { code: 'es', label: 'Español', file: 'spanish.ini' },
  { code: 'fil', label: 'Filipino', file: 'filipino.ini' },
  { code: 'fr', label: 'Français', file: 'french.ini' },
  { code: 'id', label: 'Bahasa Indonesia', file: 'indonesian.ini' },
  { code: 'it', label: 'Italiano', file: 'italian.ini' },
  { code: 'ja', label: '日本語', file: 'japanese.ini' },
  { code: 'nb', label: 'Norsk', file: 'norwegian.ini' },
  { code: 'nl', label: 'Nederlands', file: 'dutch.ini' },
  { code: 'pl', label: 'Polski', file: 'polish.ini' },
  { code: 'pt', label: 'Português', file: 'portuguese.ini' },
  { code: 'pt-BR', label: 'Português (Brasil)', file: 'portuguese-br.ini' },
  { code: 'ro', label: 'Română', file: 'romanian.ini' },
  { code: 'ru', label: 'Русский', file: 'russian.ini' },
  { code: 'sv', label: 'Svenska', file: 'swedish.ini' },
  { code: 'tr', label: 'Türkçe', file: 'turkish.ini' },
  { code: 'uk', label: 'Українська', file: 'ukrainian.ini' },
  { code: 'vi', label: 'Tiếng Việt', file: 'vietnamese.ini' },
  { code: 'zh-Hans', label: '简体中文', file: 'chinese-simplified.ini' },
  { code: 'zh-Hant', label: '繁體中文', file: 'chinese-traditional.ini' }
];

export const DEFAULT_LOCALE = 'en';

export function findLocale(code: string): Locale | undefined {
  return LOCALES.find((l) => l.code === code);
}

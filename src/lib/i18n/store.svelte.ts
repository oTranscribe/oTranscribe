import { DEFAULT_LOCALE } from './locales';
import { interpolate } from './parse-ini';

interface LocaleFile {
  code: string;
  messages: Record<string, { value: string; isHtml: boolean }>;
}

/**
 * Import every generated locale JSON eagerly. The full set is ~500 KB
 * gzipped across 24 files (average ~20 KB each — mostly short UI strings);
 * that's small enough not to be worth lazy-loading in v2 MVP. Revisit if a
 * bundle audit disagrees.
 */
const modules = import.meta.glob<LocaleFile>('./messages/*.json', {
  eager: true,
  import: 'default'
});

const bundles = new Map<string, LocaleFile>();
for (const [file, mod] of Object.entries(modules)) {
  const match = file.match(/\/messages\/(.+)\.json$/);
  if (match) bundles.set(match[1]!, mod);
}

let activeLocale = $state(DEFAULT_LOCALE);

export function getActiveLocale(): string {
  return activeLocale;
}

export function setActiveLocale(code: string): void {
  activeLocale = bundles.has(code) ? code : DEFAULT_LOCALE;
}

export function loadedLocaleCodes(): string[] {
  return Array.from(bundles.keys());
}

/**
 * Look up a message with fallback: active locale → English → key. Vars are
 * substituted via `{{name}}` placeholders. Meant to be called from Svelte
 * templates as `{t('help')}`; `activeLocale` is reactive so switching the
 * language rerenders every call site.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const primary = bundles.get(activeLocale);
  const primaryHit = primary?.messages[key];
  if (primaryHit) return interpolate(primaryHit.value, vars);
  const fallback = bundles.get(DEFAULT_LOCALE);
  const fallbackHit = fallback?.messages[key];
  if (fallbackHit) return interpolate(fallbackHit.value, vars);
  return key;
}

/** Same as `t()` but reports whether the message is HTML — for `{@html}` cases. */
export function tHtml(
  key: string,
  vars?: Record<string, string | number>
): { value: string; isHtml: boolean } {
  const primary = bundles.get(activeLocale)?.messages[key];
  const fallback = bundles.get(DEFAULT_LOCALE)?.messages[key];
  const entry = primary ?? fallback;
  if (!entry) return { value: key, isHtml: false };
  return { value: interpolate(entry.value, vars), isHtml: entry.isHtml };
}

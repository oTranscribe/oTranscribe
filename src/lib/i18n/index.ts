export { detectSessionLanguage } from './language';
export { parseWebL10nIni, interpolate, flattenMessages } from './parse-ini';
export type { WebL10nEntry, WebL10nFile } from './parse-ini';
export { LOCALES, DEFAULT_LOCALE, findLocale, type Locale } from './locales';
export { t, tHtml, getActiveLocale, setActiveLocale, loadedLocaleCodes } from './store.svelte';

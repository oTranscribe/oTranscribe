/**
 * The user's session language default, taken from the browser locale.
 * SPEC §3.1: "Default = the user's browser locale (from navigator.language)".
 */
export function detectSessionLanguage(fallback = 'en'): string {
  if (typeof navigator === 'undefined') return fallback;
  return navigator.language || fallback;
}

/**
 * Parse a webL10n INI file (the format v1 shipped its 26 locales in) into
 * `{ locale, messages }`. This is a testable, dependency-free port — no
 * hand editing, and no AI-generation of message files. Run the build script
 * to produce JSON; check the JSON into the repo.
 *
 * Format (simplified from webL10n's docs):
 *   [locale]                          ; header — the locale code (e.g. `en`, `fr`).
 *   ; comment                         ; comments start with `;`.
 *   key                 = value       ; whitespace around `=` is stripped.
 *   key.innerHTML       = <b>value</b> ; `.innerHTML` suffix flags an HTML value.
 *
 * We normalize keys with `.innerHTML` down to the bare key + `isHtml: true` in
 * the parsed record so consumers can decide whether to `{@html}` render.
 */

export interface WebL10nEntry {
  value: string;
  isHtml: boolean;
}

export interface WebL10nFile {
  locale: string;
  messages: Record<string, WebL10nEntry>;
}

const HTML_KEY_SUFFIX = '.innerHTML';

export function parseWebL10nIni(source: string): WebL10nFile {
  const messages: Record<string, WebL10nEntry> = {};
  let locale = '';
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith(';')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      locale = line.slice(1, -1);
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const rawKey = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();
    if (!rawKey) continue;
    const isHtml = rawKey.endsWith(HTML_KEY_SUFFIX);
    const key = isHtml ? rawKey.slice(0, -HTML_KEY_SUFFIX.length) : rawKey;
    messages[key] = { value, isHtml };
  }
  return { locale, messages };
}

/**
 * Flatten to a plain `{ key: value }` map, dropping the isHtml flag. Callers
 * that need to know whether a message is HTML should use the full parse; this
 * helper is for the common case (v2 UI strings, all plain text).
 */
export function flattenMessages(file: WebL10nFile): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, entry] of Object.entries(file.messages)) {
    flat[key] = entry.value;
  }
  return flat;
}

/**
 * Substitute `{{name}}` placeholders. Missing vars leave the placeholder
 * intact so untranslated strings still surface visibly.
 */
export function interpolate(message: string, vars: Record<string, string | number> = {}): string {
  return message.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, name) => {
    const value = vars[name];
    return value === undefined ? `{{${name}}}` : String(value);
  });
}

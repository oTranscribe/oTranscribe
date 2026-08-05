import type { KeymapMode } from './keymap';
import { sessionStore } from './storage';
import { DEFAULT_LOCALE } from './i18n/locales';

export const SETTING_KEYMAP_MODE = 'keymapMode';
export const DEFAULT_KEYMAP_MODE: KeymapMode = 'v2-default';

export const SETTING_UI_LOCALE = 'uiLocale';

export const SETTING_LOW_CONFIDENCE_THRESHOLD = 'lowConfidenceThreshold';
/**
 * Whisper confidence below this value gets a wavy underline in the editor.
 * 0.6 is deliberately conservative — flags obvious model doubt without over-
 * decorating a doc where most words score 0.7–0.9 in practice.
 */
export const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.6;

export const SETTING_AUTO_SCROLL = 'autoScrollDuringPlayback';
export const DEFAULT_AUTO_SCROLL = true;

export async function getKeymapMode(): Promise<KeymapMode> {
  const stored = await sessionStore().getSetting<KeymapMode>(SETTING_KEYMAP_MODE);
  return stored ?? DEFAULT_KEYMAP_MODE;
}

export async function setKeymapMode(mode: KeymapMode): Promise<void> {
  await sessionStore().setSetting(SETTING_KEYMAP_MODE, mode);
}

export async function getLowConfidenceThreshold(): Promise<number> {
  const stored = await sessionStore().getSetting<number>(SETTING_LOW_CONFIDENCE_THRESHOLD);
  return typeof stored === 'number' ? stored : DEFAULT_LOW_CONFIDENCE_THRESHOLD;
}

export async function setLowConfidenceThreshold(value: number): Promise<void> {
  const clamped = Math.max(0, Math.min(1, value));
  await sessionStore().setSetting(SETTING_LOW_CONFIDENCE_THRESHOLD, clamped);
}

export async function getAutoScroll(): Promise<boolean> {
  const stored = await sessionStore().getSetting<boolean>(SETTING_AUTO_SCROLL);
  return typeof stored === 'boolean' ? stored : DEFAULT_AUTO_SCROLL;
}

export async function setAutoScroll(value: boolean): Promise<void> {
  await sessionStore().setSetting(SETTING_AUTO_SCROLL, value);
}

export async function getUiLocale(): Promise<string> {
  const stored = await sessionStore().getSetting<string>(SETTING_UI_LOCALE);
  return stored ?? DEFAULT_LOCALE;
}

export async function setUiLocale(code: string): Promise<void> {
  await sessionStore().setSetting(SETTING_UI_LOCALE, code);
}

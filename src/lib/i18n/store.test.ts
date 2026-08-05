import { describe, expect, it, beforeEach } from 'vitest';
import { t, setActiveLocale, loadedLocaleCodes } from './store.svelte';
import { DEFAULT_LOCALE } from './locales';

describe('t()', () => {
  beforeEach(() => setActiveLocale(DEFAULT_LOCALE));

  it('resolves a known key in English', () => {
    expect(t('help')).toBe('Help');
  });

  it('falls back to English when the active locale is missing the key', () => {
    setActiveLocale('fr');
    // French INI has `help = Aide`, so this test verifies the primary hit.
    expect(t('help')).toBe('Aide');
  });

  it('returns the key itself when neither locale has it', () => {
    expect(t('this-key-does-not-exist')).toBe('this-key-does-not-exist');
  });

  it('interpolates {{n}} placeholders', () => {
    // `wordcount = {{n}} words` — canonical variable-bearing string.
    expect(t('wordcount', { n: 42 })).toBe('42 words');
  });

  it('coerces unknown locale codes to the default', () => {
    setActiveLocale('klingon');
    expect(t('help')).toBe('Help');
  });
});

describe('loadedLocaleCodes', () => {
  it('includes every locale in the LOCALES registry', () => {
    const codes = new Set(loadedLocaleCodes());
    // Sanity: at least English + French + Japanese are present.
    expect(codes.has('en')).toBe(true);
    expect(codes.has('fr')).toBe(true);
    expect(codes.has('ja')).toBe(true);
  });
});

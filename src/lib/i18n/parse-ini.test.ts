import { describe, expect, it } from 'vitest';
import { flattenMessages, interpolate, parseWebL10nIni } from './parse-ini';

describe('parseWebL10nIni', () => {
  it('reads the locale header from the first bracketed line', () => {
    expect(parseWebL10nIni('[fr]\nhelp = Aide').locale).toBe('fr');
  });

  it('splits keys and values around the first `=` and trims whitespace', () => {
    const parsed = parseWebL10nIni(
      [
        '[en]',
        'help                = Help',
        'lead                = A free web app to take the pain out of transcribing recorded interviews.'
      ].join('\n')
    );
    expect(parsed.messages['help']).toEqual({ value: 'Help', isHtml: false });
    expect(parsed.messages['lead']?.value).toContain('A free web app');
  });

  it('strips the `.innerHTML` suffix and flags the entry as HTML', () => {
    const parsed = parseWebL10nIni('[en]\npromo-1.innerHTML = <strong>No more switching</strong>');
    expect(parsed.messages['promo-1']).toEqual({
      value: '<strong>No more switching</strong>',
      isHtml: true
    });
  });

  it('ignores comments and blank lines', () => {
    const parsed = parseWebL10nIni(
      ['[en]', '; a comment', '', 'help = Help', '; === section ==='].join('\n')
    );
    expect(Object.keys(parsed.messages)).toEqual(['help']);
  });

  it('preserves `=` in values (e.g. equations, code snippets)', () => {
    const parsed = parseWebL10nIni('[en]\nformula = a = b + c');
    expect(parsed.messages['formula']?.value).toBe('a = b + c');
  });

  it('flattenMessages drops the isHtml flag', () => {
    const parsed = parseWebL10nIni('[en]\nhelp = Help\nfoo.innerHTML = <b>bar</b>');
    expect(flattenMessages(parsed)).toEqual({ help: 'Help', foo: '<b>bar</b>' });
  });
});

describe('interpolate', () => {
  it('substitutes {{name}} placeholders with provided variables', () => {
    expect(interpolate('{{n}} words', { n: 5 })).toBe('5 words');
  });
  it('leaves unknown placeholders visible so gaps in vars are noticeable', () => {
    expect(interpolate('{{a}} · {{b}}', { a: 'x' })).toBe('x · {{b}}');
  });
});

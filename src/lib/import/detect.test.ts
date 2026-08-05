import { describe, expect, it } from 'vitest';
import { detectImportKind } from './detect';

const file = (name: string, type: string) => new File([''], name, { type });

describe('detectImportKind', () => {
  it('recognizes .otr regardless of MIME type', () => {
    expect(detectImportKind(file('interview.otr', ''))).toBe('otr');
    expect(detectImportKind(file('interview.OTR', 'application/octet-stream'))).toBe('otr');
  });

  it('recognizes markdown by extension', () => {
    expect(detectImportKind(file('notes.md', ''))).toBe('markdown');
    expect(detectImportKind(file('notes.markdown', 'text/markdown'))).toBe('markdown');
  });

  it('recognizes audio + video by MIME', () => {
    expect(detectImportKind(file('a.mp3', 'audio/mpeg'))).toBe('audio');
    expect(detectImportKind(file('v.mp4', 'video/mp4'))).toBe('video');
  });

  it('returns unknown for anything else', () => {
    expect(detectImportKind(file('secret.pdf', 'application/pdf'))).toBe('unknown');
    expect(detectImportKind(file('mystery', ''))).toBe('unknown');
  });
});

import { describe, expect, it } from 'vitest';
import {
  EXPORT_FORMATS,
  exportSession,
  formatSrtTime,
  formatVttTime,
  sanitizeFilename
} from './index';
import { makeFixtureDoc, makeFixtureSession } from './fixtures';
import { docFromOtr, type OtrV2File } from '$lib/editor';

describe('EXPORT_FORMATS', () => {
  it('exposes six distinct formats and preserves their declared order', () => {
    const ids = EXPORT_FORMATS.map((f) => f.id);
    expect(ids).toEqual(['otr-v2', 'otr-v1', 'md', 'txt', 'vtt', 'srt']);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('exportSession — txt', () => {
  it('emits paragraph text separated by newlines; timestamp chips become inline [H:MM:SS] tokens', () => {
    const payload = exportSession(makeFixtureSession(), makeFixtureDoc().toJSON(), 'txt');
    expect(payload.mimeType).toBe('text/plain');
    expect(payload.filename).toBe('Interview with source.txt');
    expect(payload.body).toBe(
      '[0:12] Reporter: When did you first hear?\n[1:15] Source: Around one fifteen.'
    );
  });
});

describe('exportSession — md', () => {
  it('separates paragraphs by a blank line and keeps timestamp tokens', () => {
    const payload = exportSession(makeFixtureSession(), makeFixtureDoc().toJSON(), 'md');
    expect(payload.filename).toBe('Interview with source.md');
    expect(payload.body).toBe(
      '[0:12] Reporter: When did you first hear?\n\n[1:15] Source: Around one fifteen.'
    );
  });
});

describe('exportSession — vtt', () => {
  it('emits WebVTT header + one cue per whisper-marked paragraph', () => {
    const payload = exportSession(makeFixtureSession(), makeFixtureDoc().toJSON(), 'vtt');
    expect(payload.mimeType).toBe('text/vtt');
    expect(payload.body).toBe(
      [
        'WEBVTT',
        '',
        '1',
        '00:00:12.500 --> 00:00:15.250',
        'Reporter: When did you first hear?',
        '',
        '2',
        '00:01:15.000 --> 00:01:18.400',
        'Source: Around one fifteen.',
        ''
      ].join('\n')
    );
  });

  it('formatVttTime rounds to milliseconds and pads hours', () => {
    expect(formatVttTime(0)).toBe('00:00:00.000');
    expect(formatVttTime(3600 + 65.123)).toBe('01:01:05.123');
    expect(formatVttTime(59.9995)).toBe('00:01:00.000');
  });
});

describe('exportSession — srt', () => {
  it('emits SubRip cues with comma millisecond separator', () => {
    const payload = exportSession(makeFixtureSession(), makeFixtureDoc().toJSON(), 'srt');
    expect(payload.mimeType).toBe('application/x-subrip');
    expect(payload.body).toBe(
      [
        '1',
        '00:00:12,500 --> 00:00:15,250',
        'Reporter: When did you first hear?',
        '',
        '2',
        '00:01:15,000 --> 00:01:18,400',
        'Source: Around one fifteen.',
        ''
      ].join('\n')
    );
  });

  it('formatSrtTime uses a comma separator', () => {
    expect(formatSrtTime(65.123)).toBe('00:01:05,123');
  });
});

describe('exportSession — otr v1', () => {
  it('emits a v1-shaped JSON payload consumable by v1', () => {
    const session = makeFixtureSession();
    const payload = exportSession(session, makeFixtureDoc().toJSON(), 'otr-v1');
    expect(payload.mimeType).toBe('application/json');
    const parsed = JSON.parse(payload.body);
    expect(parsed.media).toBe('interview.mp3');
    expect(parsed['media-time']).toBe(42);
    expect(parsed.text).toContain('class="timestamp"');
    expect(parsed.text).toContain('data-timestamp="12.5"');
    expect(parsed.text).toContain('Reporter: When did you first hear?');
    expect(parsed).not.toHaveProperty('otrVersion');
  });
});

describe('exportSession — otr v2', () => {
  it('is a superset of v1 and preserves the ProseMirror doc verbatim', () => {
    const session = makeFixtureSession();
    const docJson = makeFixtureDoc().toJSON();
    const payload = exportSession(session, docJson, 'otr-v2');
    expect(payload.mimeType).toBe('application/json');
    const parsed = JSON.parse(payload.body) as OtrV2File & { syncMeta: null };
    // v1 fields survive.
    expect(parsed.text).toContain('data-timestamp="12.5"');
    expect(parsed.media).toBe('interview.mp3');
    // v2 fields present.
    expect(parsed.otrVersion).toBe(2);
    expect(parsed.sessionId).toBe(session.id);
    expect(parsed.language).toBe('en');
    expect(parsed.whisperRanges).toBe(true);
    expect(parsed.syncMeta).toBeNull();
    expect(parsed.textDoc).toEqual(docJson);
  });

  it('round-trips through docFromOtr with whisper mark timings intact', () => {
    const session = makeFixtureSession();
    const docJson = makeFixtureDoc().toJSON();
    const payload = exportSession(session, docJson, 'otr-v2');
    const parsed = JSON.parse(payload.body) as OtrV2File;
    const reHydrated = docFromOtr(parsed);
    const whispers: Array<[number, number]> = [];
    reHydrated.descendants((node) => {
      for (const mark of node.marks) {
        if (mark.type.name === 'whisper') {
          whispers.push([mark.attrs.start as number, mark.attrs.end as number]);
        }
      }
    });
    expect(whispers).toEqual([
      [12.5, 15.25],
      [75, 78.4]
    ]);
  });
});

describe('sanitizeFilename', () => {
  it('strips filesystem-hostile chars and collapses whitespace', () => {
    expect(sanitizeFilename('  Big / Story: "the one"?  ')).toBe('Big Story the one');
  });
  it('falls back to `transcript` when the title is empty after cleaning', () => {
    expect(sanitizeFilename('???')).toBe('transcript');
    expect(sanitizeFilename('   ')).toBe('transcript');
  });
});

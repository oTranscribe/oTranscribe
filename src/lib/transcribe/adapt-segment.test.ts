import { describe, expect, it } from 'vitest';
import { adaptSegment } from './client';

describe('adaptSegment', () => {
  it('converts ms offsets to seconds and averages token confidence', () => {
    const raw = {
      result: { language: 'en' },
      segment: {
        text: ' Hello world.',
        offsets: { from: 0, to: 1200 },
        timestamps: { from: '00:00:00,000', to: '00:00:01,200' },
        tokens: [
          { text: ' Hello', offsets: { from: 0, to: 500 }, p: 0.9 },
          { text: ' world.', offsets: { from: 500, to: 1200 }, p: 0.7 }
        ]
      }
    };
    const event = adaptSegment(raw);
    expect(event).not.toBeNull();
    expect(event!.type).toBe('segment');
    expect(event!.language).toBe('en');
    expect(event!.segment.start).toBeCloseTo(0);
    expect(event!.segment.end).toBeCloseTo(1.2);
    // (0.9 + 0.7) / 2 = 0.8
    expect(event!.segment.confidence).toBeCloseTo(0.8);
    expect(event!.segment.tokens).toHaveLength(2);
    expect(event!.segment.tokens[0]!.start).toBeCloseTo(0);
    expect(event!.segment.tokens[0]!.end).toBeCloseTo(0.5);
  });

  it('defaults missing token confidence to 1 (typing-during-playback semantics)', () => {
    const raw = {
      result: { language: 'de' },
      segment: {
        text: 'ja',
        offsets: { from: 100, to: 200 },
        tokens: [{ text: 'ja', offsets: { from: 100, to: 200 } }]
      }
    };
    const event = adaptSegment(raw);
    expect(event).not.toBeNull();
    expect(event!.segment.confidence).toBe(1);
  });

  it('returns null if raw is missing the segment key', () => {
    expect(adaptSegment({ result: { language: 'en' } })).toBeNull();
    expect(adaptSegment(null)).toBeNull();
  });

  it('falls back to segment offsets for tokens missing their own', () => {
    const raw = {
      result: { language: 'en' },
      segment: {
        text: 'x',
        offsets: { from: 5000, to: 6000 },
        tokens: [{ text: 'x', p: 0.5 }]
      }
    };
    const event = adaptSegment(raw)!;
    expect(event.segment.tokens[0]!.start).toBeCloseTo(5);
    expect(event.segment.tokens[0]!.end).toBeCloseTo(6);
  });

  it('applies timeOffsetSec to every segment and token time so chunks stitch cleanly', () => {
    const raw = {
      result: { language: 'en' },
      segment: {
        text: ' hello',
        offsets: { from: 1000, to: 2000 },
        tokens: [
          { text: ' hel', offsets: { from: 1000, to: 1500 }, p: 0.9 },
          { text: 'lo', offsets: { from: 1500, to: 2000 }, p: 0.9 }
        ]
      }
    };
    // Chunk 2 of many, starting at 10:00 into the source audio.
    const event = adaptSegment(raw, 600)!;
    expect(event.segment.start).toBeCloseTo(601);
    expect(event.segment.end).toBeCloseTo(602);
    expect(event.segment.tokens[0]!.start).toBeCloseTo(601);
    expect(event.segment.tokens[1]!.end).toBeCloseTo(602);
  });
});

import { describe, expect, it } from 'vitest';
import { editorSchema } from './schema';
import { whisperRangeInSelection } from './selection-bound';

function docWith(spans: Array<{ text: string; start: number; end: number } | { text: string }>) {
  const whisper = editorSchema.marks.whisper!;
  const nodes = spans.map((s) =>
    'start' in s
      ? editorSchema.text(s.text, [whisper.create({ start: s.start, end: s.end, confidence: 1 })])
      : editorSchema.text(s.text)
  );
  return editorSchema.node('doc', null, [editorSchema.node('paragraph', null, nodes)]);
}

describe('whisperRangeInSelection', () => {
  it('returns null when selection contains no whisper marks', () => {
    const doc = docWith([{ text: 'unmarked text' }]);
    expect(whisperRangeInSelection(doc, 1, 10)).toBeNull();
  });

  it('returns the single mark range when selection covers exactly one mark', () => {
    const doc = docWith([{ text: 'hello', start: 4.2, end: 5.7 }]);
    // Paragraph starts at pos 1; text spans 1..6.
    const result = whisperRangeInSelection(doc, 1, 6);
    expect(result).toEqual([4.2, 5.7]);
  });

  it('expands to earliest start + latest end across multiple marks', () => {
    const doc = docWith([
      { text: 'aaa ', start: 10, end: 12 },
      { text: 'bbb ', start: 8, end: 14 },
      { text: 'ccc', start: 15, end: 20 }
    ]);
    // Cover the whole paragraph content.
    const p = doc.firstChild!;
    const result = whisperRangeInSelection(doc, 1, 1 + p.content.size);
    expect(result).toEqual([8, 20]);
  });

  it('returns null when the selection range is empty or inverted', () => {
    const doc = docWith([{ text: 'x', start: 0, end: 1 }]);
    expect(whisperRangeInSelection(doc, 5, 5)).toBeNull();
    expect(whisperRangeInSelection(doc, 5, 3)).toBeNull();
  });
});

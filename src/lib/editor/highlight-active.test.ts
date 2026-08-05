import { describe, expect, it } from 'vitest';
import { Node as PMNode } from 'prosemirror-model';
import { editorSchema } from './schema';
import { findActiveMarks } from './highlight-active';

function docWithMarkedText(spans: Array<{ text: string; start: number; end: number }>): PMNode {
  const whisper = editorSchema.marks.whisper!;
  const nodes = spans.map((s) =>
    editorSchema.text(s.text, [whisper.create({ start: s.start, end: s.end, confidence: 1 })])
  );
  return editorSchema.node('doc', null, [editorSchema.node('paragraph', null, nodes)]);
}

describe('findActiveMarks', () => {
  it('returns the mark whose range brackets the playhead', () => {
    const doc = docWithMarkedText([
      { text: 'hello ', start: 0, end: 1 },
      { text: 'world', start: 2, end: 3 }
    ]);
    const { marks } = findActiveMarks(doc, 2.5);
    expect(marks).toHaveLength(1);
    expect(marks[0]!.start).toBe(2);
    expect(marks[0]!.end).toBe(3);
  });

  it('returns no marks when playhead is between two ranges', () => {
    const doc = docWithMarkedText([
      { text: 'a', start: 0, end: 1 },
      { text: 'b', start: 2, end: 3 }
    ]);
    const { marks } = findActiveMarks(doc, 1.5);
    expect(marks).toHaveLength(0);
  });

  it('returns multiple marks when distinct ranges both bracket the playhead (post-edit)', () => {
    // Different {start, end} keeps them from being merged by ProseMirror's
    // text-node consolidation, so both appear in the active set.
    const doc = docWithMarkedText([
      { text: 'foo', start: 0, end: 6 },
      { text: 'bar', start: 2, end: 5 }
    ]);
    const { marks } = findActiveMarks(doc, 3);
    expect(marks).toHaveLength(2);
  });

  it('produces stable signatures across identical states — cheap diffing', () => {
    const doc = docWithMarkedText([{ text: 'x', start: 0, end: 10 }]);
    const a = findActiveMarks(doc, 5).signature;
    const b = findActiveMarks(doc, 5).signature;
    expect(a).toBe(b);
    expect(a).not.toBe('');
  });

  it('signature changes when the active-mark set changes', () => {
    const doc = docWithMarkedText([
      { text: 'a', start: 0, end: 1 },
      { text: 'b', start: 5, end: 6 }
    ]);
    const early = findActiveMarks(doc, 0.5).signature;
    const late = findActiveMarks(doc, 5.5).signature;
    expect(early).not.toBe(late);
  });
});

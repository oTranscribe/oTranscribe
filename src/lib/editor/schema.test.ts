import { describe, expect, it } from 'vitest';
import { Node as PMNode } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { editorSchema, emptyDoc, parseTimestamp } from './schema';

function docJson(...content: unknown[]) {
  return { type: 'doc', content };
}

function para(...children: unknown[]) {
  return { type: 'paragraph', content: children.length ? children : undefined };
}

function text(value: string, marks?: unknown[]) {
  return { type: 'text', text: value, ...(marks ? { marks } : {}) };
}

function timestamp(time: number) {
  return { type: 'timestamp', attrs: { time } };
}

function whisperMark(start: number, end: number, confidence = 1) {
  return { type: 'whisper', attrs: { start, end, confidence } };
}

describe('editor schema', () => {
  it('creates an empty doc with one empty paragraph', () => {
    const doc = PMNode.fromJSON(editorSchema, emptyDoc());
    expect(doc.childCount).toBe(1);
    expect(doc.firstChild?.type.name).toBe('paragraph');
  });

  it('roundtrips a paragraph with an inline timestamp node', () => {
    const original = docJson(para(text('Interview begins '), timestamp(12.5), text(' now')));
    const doc = PMNode.fromJSON(editorSchema, original);
    expect(doc.toJSON()).toEqual(original);
  });

  it('preserves whisper mark attrs across JSON roundtrip', () => {
    const original = docJson(para(text('hello world', [whisperMark(1.2, 2.8, 0.87)])));
    const doc = PMNode.fromJSON(editorSchema, original);
    expect(doc.toJSON()).toEqual(original);
  });

  it('splitting a whisper-marked range keeps the same start/end on both halves', () => {
    const original = docJson(para(text('once upon a time', [whisperMark(1, 5, 0.9)])));
    const state = EditorState.create({ doc: PMNode.fromJSON(editorSchema, original) });
    // Cursor is placed just after "once upon a" (position 12 = 1 doc + 1 para-open + 10 chars)
    const splitPos = 1 + 1 + 'once upon a'.length;
    // Delete the space between "a" and "time" to create two adjacent marked spans:
    // "once upon a" and "time"
    const tr = state.tr.delete(splitPos, splitPos + 1);
    const nextDoc = state.apply(tr).doc;
    const marks: { start: unknown; end: unknown }[] = [];
    nextDoc.descendants((node) => {
      if (node.isText) {
        for (const m of node.marks)
          if (m.type.name === 'whisper') marks.push({ start: m.attrs.start, end: m.attrs.end });
      }
    });
    expect(marks.length).toBeGreaterThan(0);
    for (const m of marks) {
      expect(m.start).toBe(1);
      expect(m.end).toBe(5);
    }
  });
});

describe('parseTimestamp', () => {
  it('parses numeric strings as seconds', () => {
    expect(parseTimestamp('12.5')).toBe(12.5);
    expect(parseTimestamp('120')).toBe(120);
  });

  it('parses MM:SS', () => {
    expect(parseTimestamp('1:30')).toBe(90);
  });

  it('parses HH:MM:SS', () => {
    expect(parseTimestamp('1:02:03')).toBe(3723);
  });

  it('returns 0 for empty or garbage input', () => {
    expect(parseTimestamp('')).toBe(0);
    expect(parseTimestamp('nonsense')).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { appendWhisperSegmentCommand } from './commands';
import { editorSchema, emptyDoc } from './schema';
import { Node as PMNode } from 'prosemirror-model';

function stateFromEmpty(): EditorState {
  return EditorState.create({
    doc: PMNode.fromJSON(editorSchema, emptyDoc()),
    schema: editorSchema
  });
}

function stateFromDoc(json: unknown): EditorState {
  return EditorState.create({
    doc: PMNode.fromJSON(editorSchema, json as Parameters<typeof PMNode.fromJSON>[1]),
    schema: editorSchema
  });
}

function run(
  state: EditorState,
  seg: Parameters<typeof appendWhisperSegmentCommand>[0]
): EditorState {
  const cmd = appendWhisperSegmentCommand(seg);
  let next = state;
  const ok = cmd(state, (tr) => (next = state.apply(tr)));
  if (!ok) throw new Error('command returned false');
  return next;
}

describe('appendWhisperSegmentCommand', () => {
  it('replaces the empty trailing paragraph on first append', () => {
    const state = stateFromEmpty();
    const after = run(state, { start: 1.2, end: 3.4, text: ' Hello there.', confidence: 0.9 });
    // doc should still have exactly one paragraph, now containing timestamp + text.
    expect(after.doc.childCount).toBe(1);
    const p = after.doc.firstChild!;
    expect(p.type.name).toBe('paragraph');
    expect(p.firstChild!.type.name).toBe('timestamp');
    expect(p.firstChild!.attrs.time).toBeCloseTo(1.2);
    // Text with a leading space so the chip and text don't collide.
    expect(p.textContent).toContain('Hello there.');
  });

  it('appends a new paragraph when the last block already has content', () => {
    const state = stateFromEmpty();
    const s1 = run(state, { start: 0, end: 1, text: 'First', confidence: 1 });
    const s2 = run(s1, { start: 1, end: 2, text: 'Second', confidence: 1 });
    expect(s2.doc.childCount).toBe(2);
    expect(s2.doc.firstChild!.textContent).toContain('First');
    expect(s2.doc.lastChild!.textContent).toContain('Second');
  });

  it('attaches a whisper mark spanning the inserted text with the segment range', () => {
    const state = stateFromEmpty();
    const after = run(state, { start: 5, end: 8.5, text: 'quick brown fox', confidence: 0.72 });
    const p = after.doc.firstChild!;
    // Walk the paragraph's inline children to find the text node.
    let textNode: PMNode | null = null;
    p.forEach((child) => {
      if (child.isText) textNode = child;
    });
    expect(textNode).not.toBeNull();
    const marks = textNode!.marks;
    expect(marks.length).toBe(1);
    expect(marks[0]!.type.name).toBe('whisper');
    expect(marks[0]!.attrs).toEqual({ start: 5, end: 8.5, confidence: 0.72 });
  });

  it('handles empty text (timestamp-only segment) without error', () => {
    const state = stateFromEmpty();
    const after = run(state, { start: 12, end: 12.5, text: '   ', confidence: 1 });
    const p = after.doc.firstChild!;
    expect(p.firstChild!.type.name).toBe('timestamp');
    expect(p.textContent.trim()).toBe('');
  });

  it('leaves existing user paragraphs above the appended segment untouched', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'User notes.' }] }]
    };
    const state = stateFromDoc(doc);
    const after = run(state, { start: 0, end: 1, text: 'From whisper', confidence: 1 });
    expect(after.doc.childCount).toBe(2);
    expect(after.doc.firstChild!.textContent).toBe('User notes.');
    expect(after.doc.lastChild!.textContent).toContain('From whisper');
  });
});

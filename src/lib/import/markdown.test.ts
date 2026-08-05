import { describe, expect, it } from 'vitest';
import { editorSchema } from '$lib/editor';
import { docFromMarkdown } from './markdown';

function collectTimestamps(docJson: unknown): number[] {
  const doc = editorSchema.nodeFromJSON(docJson as Parameters<typeof editorSchema.nodeFromJSON>[0]);
  const out: number[] = [];
  doc.descendants((n) => {
    if (n.type.name === 'timestamp') out.push(n.attrs.time as number);
  });
  return out;
}

function paragraphs(docJson: unknown): string[] {
  const doc = editorSchema.nodeFromJSON(docJson as Parameters<typeof editorSchema.nodeFromJSON>[0]);
  const out: string[] = [];
  doc.forEach((block) => out.push(block.textContent));
  return out;
}

describe('docFromMarkdown', () => {
  it('splits on blank lines into paragraphs', () => {
    const doc = docFromMarkdown('First line.\n\nSecond line.\n\nThird.');
    expect(paragraphs(doc)).toEqual(['First line.', 'Second line.', 'Third.']);
  });

  it('promotes [H:MM:SS] tokens to timestamp nodes', () => {
    const doc = docFromMarkdown('[0:12] Reporter: hello.\n\n[1:15] Source: yes.');
    expect(collectTimestamps(doc)).toEqual([12, 75]);
  });

  it('preserves plain seconds inside bracket syntax', () => {
    const doc = docFromMarkdown('[42] Bare seconds.');
    expect(collectTimestamps(doc)).toEqual([42]);
  });

  it('returns a doc with an empty paragraph for empty input', () => {
    const doc = docFromMarkdown('');
    expect(paragraphs(doc)).toEqual(['']);
  });

  it('normalizes windows-style CRLF newlines', () => {
    const doc = docFromMarkdown('One.\r\n\r\nTwo.');
    expect(paragraphs(doc)).toEqual(['One.', 'Two.']);
  });
});

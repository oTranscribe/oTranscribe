import { describe, expect, it } from 'vitest';
import { docFromOtr, docFromV1Html } from './otr-import';

describe('docFromV1Html', () => {
  it('lifts a v1 timestamp span into a timestamp node', () => {
    const html =
      '<p>hello <span class="timestamp" contenteditable="false" data-timestamp="12.5">0:12</span> world</p>';
    const doc = docFromV1Html(html);
    expect(doc.childCount).toBe(1);
    const para = doc.firstChild!;
    const kinds = [] as { type: string; text?: string; time?: number }[];
    para.forEach((child) => {
      if (child.isText) kinds.push({ type: 'text', text: child.text });
      else if (child.type.name === 'timestamp')
        kinds.push({ type: 'timestamp', time: child.attrs.time as number });
    });
    expect(kinds).toEqual([
      { type: 'text', text: 'hello ' },
      { type: 'timestamp', time: 12.5 },
      { type: 'text', text: ' world' }
    ]);
  });

  it('parses v1 colon-formatted data-timestamp for backwards compatibility', () => {
    const html =
      '<p><span class="timestamp" contenteditable="false" data-timestamp="1:23">1:23</span> after</p>';
    const doc = docFromV1Html(html);
    let timestampTime: number | null = null;
    doc.descendants((node) => {
      if (node.type.name === 'timestamp') timestampTime = node.attrs.time as number;
    });
    expect(timestampTime).toBe(83);
  });

  it('produces an empty document for empty or missing text', () => {
    const doc = docFromV1Html('');
    expect(doc.childCount).toBe(1);
    expect(doc.firstChild?.type.name).toBe('paragraph');
    expect(doc.firstChild?.textContent).toBe('');
  });

  it('flattens v1 formatting marks to plain text (MVP schema is plain-text)', () => {
    const html = '<p>plain <b>bold</b> and <i>italic</i> mixed</p>';
    const doc = docFromV1Html(html);
    expect(doc.textContent).toBe('plain bold and italic mixed');
  });
});

describe('docFromOtr', () => {
  it('prefers textDoc over the legacy text HTML when present', () => {
    const otr = {
      otrVersion: 2 as const,
      text: '<p>ignored</p>',
      textDoc: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'from doc' }] }]
      }
    };
    const doc = docFromOtr(otr);
    expect(doc.textContent).toBe('from doc');
  });

  it('falls back to text HTML for v1 files', () => {
    const otr = { text: '<p>hello</p>' };
    const doc = docFromOtr(otr);
    expect(doc.textContent).toBe('hello');
  });
});

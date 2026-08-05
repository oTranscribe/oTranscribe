import { editorSchema, parseTimestamp } from '$lib/editor';

/**
 * Parse a Markdown-ish transcript into a ProseMirror doc. This is not a full
 * CommonMark parser — we only handle what oTranscribe's own `.md` export
 * emits: paragraphs separated by blank lines, plus inline timestamp tokens of
 * the form `[H:MM:SS]`.
 *
 * Inline emphasis, headings, lists, and links are passed through as literal
 * text — the MVP schema has no room for them, and preserving them as text is
 * better than silently dropping. When we add Markdown editing (SPEC §9), this
 * gets swapped for a real parser.
 */
export function docFromMarkdown(source: string) {
  const paragraphs = source.replace(/\r\n?/g, '\n').split(/\n{2,}/);
  const { paragraph } = editorSchema.nodes;
  const blocks = paragraphs
    .map((raw) => raw.replace(/\n/g, ' ').trim())
    .filter((raw) => raw.length > 0)
    .map((raw) => paragraph.create({}, buildInline(raw)));
  if (blocks.length === 0) blocks.push(paragraph.create());
  return editorSchema.node('doc', null, blocks).toJSON();
}

const TIMESTAMP_RE = /\[([0-9]+(?::[0-9]+)*(?:\.[0-9]+)?)\]/g;

function buildInline(text: string) {
  const { timestamp } = editorSchema.nodes;
  const nodes = [];
  let cursor = 0;
  for (const match of text.matchAll(TIMESTAMP_RE)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(editorSchema.text(text.slice(cursor, start)));
    nodes.push(timestamp.create({ time: parseTimestamp(match[1]!) }));
    cursor = start + match[0].length;
  }
  if (cursor < text.length) nodes.push(editorSchema.text(text.slice(cursor)));
  return nodes;
}

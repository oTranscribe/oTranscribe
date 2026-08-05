import type { Node as PMNode } from 'prosemirror-model';

/**
 * A single caption cue derived from a ProseMirror paragraph.
 *
 * `start` and `end` come from the whisper marks in the paragraph — the earliest
 * start and the latest end. Paragraphs without any whisper marks are skipped:
 * captions require timing, and user-typed text without a mark has none.
 */
export interface Cue {
  start: number;
  end: number;
  text: string;
}

/**
 * Extract cues from a doc. One paragraph → one cue when the paragraph carries
 * whisper marks. The leading inline timestamp node (if any) is dropped from the
 * cue text so the caption reads as prose, not "0:12 Was it a call?".
 */
export function extractCues(doc: PMNode): Cue[] {
  const cues: Cue[] = [];
  doc.forEach((block) => {
    let start = Number.POSITIVE_INFINITY;
    let end = Number.NEGATIVE_INFINITY;
    const parts: string[] = [];
    block.forEach((inline) => {
      if (inline.type.name === 'timestamp') return;
      if (inline.isText) {
        parts.push(inline.text ?? '');
        for (const mark of inline.marks) {
          if (mark.type.name === 'whisper') {
            const s = Number(mark.attrs.start);
            const e = Number(mark.attrs.end);
            if (Number.isFinite(s)) start = Math.min(start, s);
            if (Number.isFinite(e)) end = Math.max(end, e);
          }
        }
      }
    });
    const text = parts.join('').trim();
    if (!text) return;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    cues.push({ start, end, text });
  });
  return cues;
}

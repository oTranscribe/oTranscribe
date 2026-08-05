import type { Node as PMNode } from 'prosemirror-model';
import { formatTime } from '$lib/player';

/**
 * Human-readable plain-text export. Paragraphs are separated by a single
 * newline; timestamp chips render as `[H:MM:SS]` inline. Distinct from
 * `docToPlainText` in `$lib/editor`, which is optimized for the library
 * preview (compact, raw-second timestamps) rather than for humans reading
 * a downloaded transcript.
 */
export function docToTxt(doc: PMNode): string {
  const lines: string[] = [];
  doc.forEach((block) => {
    const parts: string[] = [];
    block.forEach((inline) => {
      if (inline.type.name === 'timestamp') {
        parts.push(`[${formatTime(inline.attrs.time as number)}]`);
      } else if (inline.isText) {
        parts.push(inline.text ?? '');
      }
    });
    lines.push(parts.join(''));
  });
  return lines.join('\n');
}

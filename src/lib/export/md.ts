import type { Node as PMNode } from 'prosemirror-model';
import { formatTime } from '$lib/player';

/**
 * Markdown export. Each paragraph becomes its own paragraph, separated by a
 * blank line. Timestamp nodes render as `[H:MM:SS]` inline — the same shape
 * v1 emitted, so `.md` files stay grep-friendly.
 *
 * We deliberately do not encode whisper mark spans here — Markdown has no
 * standard for per-word timing and adding HTML `<span>`s would defeat the
 * "readable in any editor" purpose of the format.
 */
export function docToMarkdown(doc: PMNode): string {
  const paragraphs: string[] = [];
  doc.forEach((block) => {
    const parts: string[] = [];
    block.forEach((inline) => {
      if (inline.type.name === 'timestamp') {
        parts.push(`[${formatTime(inline.attrs.time as number)}]`);
      } else if (inline.isText) {
        parts.push(inline.text ?? '');
      }
    });
    const text = parts.join('').trim();
    if (text) paragraphs.push(text);
  });
  return paragraphs.join('\n\n');
}

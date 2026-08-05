import type { Node as PMNode } from 'prosemirror-model';
import { extractCues } from './cues';
import { formatTimecode } from './vtt';

export function docToSrt(doc: PMNode): string {
  const cues = extractCues(doc);
  const lines: string[] = [];
  cues.forEach((cue, index) => {
    lines.push(String(index + 1));
    lines.push(`${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}`);
    lines.push(cue.text);
    lines.push('');
  });
  return lines.join('\n');
}

/** SRT: `HH:MM:SS,mmm` (comma separator on millis). */
export function formatSrtTime(seconds: number): string {
  return formatTimecode(seconds, ',');
}

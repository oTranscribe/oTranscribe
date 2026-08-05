import type { Node as PMNode } from 'prosemirror-model';
import { extractCues, type Cue } from './cues';

export function docToVtt(doc: PMNode): string {
  const cues = extractCues(doc);
  const lines: string[] = ['WEBVTT', ''];
  cues.forEach((cue, index) => {
    lines.push(String(index + 1));
    lines.push(`${formatVttTime(cue.start)} --> ${formatVttTime(cue.end)}`);
    lines.push(cue.text);
    lines.push('');
  });
  return lines.join('\n');
}

/** VTT: `HH:MM:SS.mmm` (dot separator on millis). */
export function formatVttTime(seconds: number): string {
  return formatTimecode(seconds, '.');
}

function formatTimecode(seconds: number, msSep: '.' | ','): string {
  const clamped = Math.max(0, seconds);
  const totalMs = Math.round(clamped * 1000);
  const ms = totalMs % 1000;
  const totalS = Math.floor(totalMs / 1000);
  const s = totalS % 60;
  const totalM = Math.floor(totalS / 60);
  const m = totalM % 60;
  const h = Math.floor(totalM / 60);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}${msSep}${pad3(ms)}`;
}

export type { Cue };
export { formatTimecode };

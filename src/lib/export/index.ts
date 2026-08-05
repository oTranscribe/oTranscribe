import type { Node as PMNode } from 'prosemirror-model';
import { editorSchema, emptyDoc } from '$lib/editor';
import type { Session } from '$lib/storage';
import { docToTxt } from './txt';
import { docToMarkdown } from './md';
import { docToVtt } from './vtt';
import { docToSrt } from './srt';
import { docToOtrV1, docToOtrV2 } from './otr';

export type ExportFormat = 'txt' | 'md' | 'vtt' | 'srt' | 'otr-v1' | 'otr-v2';

export interface ExportFormatMeta {
  id: ExportFormat;
  label: string;
  extension: string;
  mimeType: string;
  /** True when the caption formats need whisper marks — hidden if the doc has none. */
  requiresWhisperMarks: boolean;
}

export const EXPORT_FORMATS: readonly ExportFormatMeta[] = [
  {
    id: 'otr-v2',
    label: 'oTranscribe v2 (.otr)',
    extension: 'otr',
    mimeType: 'application/json',
    requiresWhisperMarks: false
  },
  {
    id: 'otr-v1',
    label: 'oTranscribe v1 (.otr)',
    extension: 'otr',
    mimeType: 'application/json',
    requiresWhisperMarks: false
  },
  {
    id: 'md',
    label: 'Markdown',
    extension: 'md',
    mimeType: 'text/markdown',
    requiresWhisperMarks: false
  },
  {
    id: 'txt',
    label: 'Plain text',
    extension: 'txt',
    mimeType: 'text/plain',
    requiresWhisperMarks: false
  },
  {
    id: 'vtt',
    label: 'WebVTT',
    extension: 'vtt',
    mimeType: 'text/vtt',
    requiresWhisperMarks: true
  },
  {
    id: 'srt',
    label: 'SubRip',
    extension: 'srt',
    mimeType: 'application/x-subrip',
    requiresWhisperMarks: true
  }
];

export interface ExportPayload {
  filename: string;
  mimeType: string;
  body: string;
}

/**
 * Render a session in a given format. Returns a string body + filename + MIME
 * so callers can decide whether to download, copy to clipboard, or preview.
 * Pure — takes the doc JSON and Session record; no DOM side effects.
 */
export function exportSession(
  session: Session,
  docJson: unknown,
  format: ExportFormat
): ExportPayload {
  const meta = EXPORT_FORMATS.find((f) => f.id === format);
  if (!meta) throw new Error(`Unknown export format: ${format}`);
  const doc = hydrateDoc(docJson);

  const body = renderBody(format, doc, session, docJson);
  return {
    filename: `${sanitizeFilename(session.title)}.${meta.extension}`,
    mimeType: meta.mimeType,
    body
  };
}

function renderBody(format: ExportFormat, doc: PMNode, session: Session, docJson: unknown): string {
  switch (format) {
    case 'txt':
      return docToTxt(doc);
    case 'md':
      return docToMarkdown(doc);
    case 'vtt':
      return docToVtt(doc);
    case 'srt':
      return docToSrt(doc);
    case 'otr-v1':
      return JSON.stringify(docToOtrV1(doc, session));
    case 'otr-v2':
      return JSON.stringify(docToOtrV2(doc, session, docJson));
  }
}

function hydrateDoc(docJson: unknown): PMNode {
  const source = (docJson ?? emptyDoc()) as Parameters<typeof editorSchema.nodeFromJSON>[0];
  return editorSchema.nodeFromJSON(source);
}

/**
 * Strip characters that browsers refuse in download attributes on Windows/mac
 * and collapse whitespace. Empty titles fall back to `transcript`.
 */
export function sanitizeFilename(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'transcript';
}

/** Trigger a browser download for a rendered payload. */
export function downloadPayload(payload: ExportPayload): void {
  const blob = new Blob([payload.body], { type: payload.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = payload.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Delay revoke so the click has time to bind the URL in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { docToTxt } from './txt';
export { docToMarkdown } from './md';
export { docToVtt, formatVttTime } from './vtt';
export { docToSrt, formatSrtTime } from './srt';
export { docToOtrV1, docToOtrV2 } from './otr';
export type { OtrV1Payload, OtrV2Payload } from './otr';
export { extractCues, type Cue } from './cues';

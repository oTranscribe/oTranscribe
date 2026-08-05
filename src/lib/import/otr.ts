import { docFromOtr, docToPlainText, type OtrV1File, type OtrV2File } from '$lib/editor';

export interface OtrImportResult {
  /** Title guess — .otr v1 has no title; we fall back to the source filename. */
  title: string;
  /** ProseMirror doc JSON, ready to hand to a fresh session. */
  textDoc: unknown;
  /** Plain-text projection for library preview / grep. */
  text: string;
  /** Language, when the file carries it (v2 only). */
  language?: string;
  /** Media filename hint from the original file — used to prompt the user to re-attach. */
  mediaHint?: string;
  /** Last playback position from the source file. */
  playbackTime: number;
  /** Source format for logging / migration UI. */
  format: 'otr-v1' | 'otr-v2';
}

export async function importOtrFile(file: File): Promise<OtrImportResult> {
  const raw = await file.text();
  const parsed = JSON.parse(raw) as OtrV1File | OtrV2File;
  const doc = docFromOtr(parsed);
  const v2 = parsed as OtrV2File;
  const format: 'otr-v1' | 'otr-v2' = v2.otrVersion === 2 ? 'otr-v2' : 'otr-v1';
  const fileTitle = file.name.replace(/\.otr$/i, '');
  return {
    title: fileTitle,
    textDoc: doc.toJSON(),
    text: docToPlainText(doc),
    language: v2.language,
    mediaHint: typeof parsed.media === 'string' ? parsed.media : undefined,
    playbackTime: Number(parsed['media-time']) || 0,
    format
  };
}

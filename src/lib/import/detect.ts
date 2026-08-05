/**
 * Sniff an uploaded file to decide the import path. We look at the extension
 * first (browsers are inconsistent about MIME on `.otr`) and only trust
 * `file.type` for audio/video, which browsers do get right.
 */
export type ImportKind = 'audio' | 'video' | 'otr' | 'markdown' | 'unknown';

export function detectImportKind(file: File): ImportKind {
  const name = file.name.toLowerCase();
  if (name.endsWith('.otr')) return 'otr';
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'markdown';
  const type = file.type || '';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  return 'unknown';
}

import { DOMParser as PMDOMParser, type Node as PMNode } from 'prosemirror-model';
import { editorSchema, emptyDoc } from './schema';

export interface OtrV1File {
  text?: string;
  media?: string;
  'media-time'?: number | string;
  'media-source'?: string;
}

export interface OtrV2File extends OtrV1File {
  otrVersion?: 1 | 2;
  sessionId?: string;
  textDoc?: unknown;
  language?: string;
  whisperRanges?: boolean;
  syncMeta?: unknown;
}

const domParser = PMDOMParser.fromSchema(editorSchema);

export function docFromV1Html(html: string): PMNode {
  if (!html || !html.trim()) {
    return editorSchema.nodeFromJSON(emptyDoc());
  }
  const container = document.createElement('div');
  container.innerHTML = html;
  return domParser.parse(container);
}

export function docFromOtr(file: OtrV1File | OtrV2File): PMNode {
  const v2 = file as OtrV2File;
  if (v2.textDoc) {
    try {
      return editorSchema.nodeFromJSON(
        v2.textDoc as Parameters<typeof editorSchema.nodeFromJSON>[0]
      );
    } catch {
      /* fall through to HTML path */
    }
  }
  return docFromV1Html(file.text ?? '');
}

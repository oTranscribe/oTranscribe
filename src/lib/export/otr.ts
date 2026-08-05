import type { Node as PMNode } from 'prosemirror-model';
import { docToV1Html } from '$lib/editor';
import type { Session } from '$lib/storage';

export interface OtrV1Payload {
  text: string;
  media: string;
  'media-time': number;
  'media-source': string;
}

/**
 * v2 superset: v1 fields + `otrVersion: 2`, `sessionId`, `textDoc` (ProseMirror
 * JSON), `language`, `whisperRanges` flag, and `syncMeta: null` per SPEC §6.
 * v1 tools ignore unknown keys and read `text` as before, so this is a genuine
 * superset.
 */
export interface OtrV2Payload extends OtrV1Payload {
  otrVersion: 2;
  sessionId: string;
  textDoc: unknown;
  language: string;
  whisperRanges: true;
  syncMeta: null;
}

export function docToOtrV1(doc: PMNode, session: Session): OtrV1Payload {
  return {
    text: docToV1Html(doc),
    media: session.media.name,
    'media-time': session.playbackTime,
    'media-source': ''
  };
}

export function docToOtrV2(doc: PMNode, session: Session, docJson: unknown): OtrV2Payload {
  return {
    ...docToOtrV1(doc, session),
    otrVersion: 2,
    sessionId: session.id,
    textDoc: docJson,
    language: session.language,
    whisperRanges: true,
    syncMeta: null
  };
}

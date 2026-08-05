export type SyncStatus = 'local-only';

export interface MediaMeta {
  name: string;
  type: string;
  size: number;
  duration?: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  media: MediaMeta;
  /** Plain-text projection of the transcript, kept for library previews and v1 export. */
  text: string;
  /** ProseMirror doc JSON — the source of truth for editor content. */
  textDoc: unknown | null;
  playbackTime: number;
  language: string;
  syncStatus: SyncStatus;
}

export interface CreateSessionInput {
  title: string;
  mediaFile: File;
  language: string;
}

/**
 * Import path: create a session from a parsed .otr / .md — the transcript
 * already exists; a media blob may or may not have been supplied. When it's
 * absent, `media` carries a hint (filename from the source file) and the
 * session page shows an "attach media" affordance until the user binds one.
 */
export interface CreateImportedSessionInput {
  title: string;
  text: string;
  textDoc: unknown;
  language: string;
  playbackTime: number;
  media: MediaMeta;
  mediaBlob?: Blob;
}

export interface SessionStore {
  list(): Promise<Session[]>;
  get(id: string): Promise<Session | undefined>;
  create(input: CreateSessionInput): Promise<Session>;
  createFromImport(input: CreateImportedSessionInput): Promise<Session>;
  /** Attach or replace the media blob for an existing session. */
  setMedia(id: string, file: File): Promise<void>;
  update(id: string, patch: Partial<Omit<Session, 'id' | 'createdAt'>>): Promise<void>;
  delete(id: string): Promise<void>;
  /**
   * Clone a session: new id, new timestamps, cloned media blob. Editor
   * content (text + textDoc + playbackTime) copies through so the user has
   * an editable duplicate of the transcript.
   */
  duplicate(id: string): Promise<Session>;
  getMedia(id: string): Promise<Blob | undefined>;
  getSetting<T>(key: string): Promise<T | undefined>;
  setSetting<T>(key: string, value: T): Promise<void>;
}

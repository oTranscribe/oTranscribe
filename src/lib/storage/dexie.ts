import Dexie, { type Table } from 'dexie';
import type {
  CreateImportedSessionInput,
  CreateSessionInput,
  Session,
  SessionStore
} from './types';

interface MediaBlobRow {
  id: string;
  blob: Blob;
}

interface SettingRow {
  key: string;
  value: unknown;
}

class OTranscribeDB extends Dexie {
  sessions!: Table<Session, string>;
  mediaBlobs!: Table<MediaBlobRow, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    super('otranscribe');
    this.version(1).stores({
      sessions: 'id, updatedAt',
      mediaBlobs: 'id',
      settings: 'key'
    });
  }
}

export class DexieSessionStore implements SessionStore {
  private db: OTranscribeDB;

  constructor(db: OTranscribeDB = new OTranscribeDB()) {
    this.db = db;
  }

  async list(): Promise<Session[]> {
    return this.db.sessions.orderBy('updatedAt').reverse().toArray();
  }

  async get(id: string): Promise<Session | undefined> {
    return this.db.sessions.get(id);
  }

  async create(input: CreateSessionInput): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: crypto.randomUUID(),
      title: input.title,
      createdAt: now,
      updatedAt: now,
      media: {
        name: input.mediaFile.name,
        type: input.mediaFile.type,
        size: input.mediaFile.size
      },
      text: '',
      textDoc: null,
      playbackTime: 0,
      language: input.language,
      syncStatus: 'local-only'
    };

    await this.db.transaction('rw', this.db.sessions, this.db.mediaBlobs, async () => {
      await this.db.sessions.add(session);
      await this.db.mediaBlobs.add({ id: session.id, blob: input.mediaFile });
    });

    return session;
  }

  async update(id: string, patch: Partial<Omit<Session, 'id' | 'createdAt'>>): Promise<void> {
    await this.db.sessions.update(id, { ...patch, updatedAt: Date.now() });
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.sessions, this.db.mediaBlobs, async () => {
      await this.db.sessions.delete(id);
      await this.db.mediaBlobs.delete(id);
    });
  }

  async createFromImport(input: CreateImportedSessionInput): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: crypto.randomUUID(),
      title: input.title,
      createdAt: now,
      updatedAt: now,
      media: input.media,
      text: input.text,
      textDoc: input.textDoc,
      playbackTime: input.playbackTime,
      language: input.language,
      syncStatus: 'local-only'
    };
    await this.db.transaction('rw', this.db.sessions, this.db.mediaBlobs, async () => {
      await this.db.sessions.add(session);
      if (input.mediaBlob) {
        await this.db.mediaBlobs.add({ id: session.id, blob: input.mediaBlob });
      }
    });
    return session;
  }

  async setMedia(id: string, file: File): Promise<void> {
    const media = { name: file.name, type: file.type, size: file.size };
    await this.db.transaction('rw', this.db.sessions, this.db.mediaBlobs, async () => {
      const existing = await this.db.sessions.get(id);
      if (!existing) throw new Error(`Session ${id} not found`);
      await this.db.mediaBlobs.put({ id, blob: file });
      await this.db.sessions.update(id, { media, updatedAt: Date.now() });
    });
  }

  async duplicate(id: string): Promise<Session> {
    const source = await this.db.sessions.get(id);
    if (!source) throw new Error(`Session ${id} not found`);
    const now = Date.now();
    const clone: Session = {
      ...source,
      id: crypto.randomUUID(),
      title: `Copy of ${source.title}`,
      createdAt: now,
      updatedAt: now
    };
    await this.db.transaction('rw', this.db.sessions, this.db.mediaBlobs, async () => {
      await this.db.sessions.add(clone);
      const media = await this.db.mediaBlobs.get(id);
      if (media) {
        // Clone the blob so IDB stores an independent copy — same bytes, new key.
        await this.db.mediaBlobs.add({
          id: clone.id,
          blob: media.blob.slice(0, media.blob.size, media.blob.type)
        });
      }
    });
    return clone;
  }

  async getMedia(id: string): Promise<Blob | undefined> {
    const row = await this.db.mediaBlobs.get(id);
    return row?.blob;
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    const row = await this.db.settings.get(key);
    return row?.value as T | undefined;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    await this.db.settings.put({ key, value });
  }
}

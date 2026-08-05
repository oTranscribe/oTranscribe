import { DexieSessionStore } from './dexie';
import type { SessionStore } from './types';

export type {
  Session,
  MediaMeta,
  SessionStore,
  CreateSessionInput,
  CreateImportedSessionInput
} from './types';

let store: SessionStore | undefined;

export function sessionStore(): SessionStore {
  if (!store) store = new DexieSessionStore();
  return store;
}

export function __setSessionStoreForTest(s: SessionStore): void {
  store = s;
}

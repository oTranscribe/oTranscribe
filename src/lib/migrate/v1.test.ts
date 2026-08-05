import { beforeEach, describe, expect, it } from 'vitest';
import { discoverV1Backups, dumpV1Storage, runV1Migration, V1_MIGRATED_SETTING } from './v1';
import type { CreateImportedSessionInput, Session, SessionStore } from '$lib/storage';
import { __setSessionStoreForTest } from '$lib/storage';

/**
 * Minimal in-memory Storage stub — enough for `discoverV1Backups` and the
 * `dumpV1Storage` escape hatch. Implements the shape we use, not the full
 * Web Storage API.
 */
function memoryStorage(seed: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(seed));
  return {
    get length() {
      return data.size;
    },
    key(i: number): string | null {
      return Array.from(data.keys())[i] ?? null;
    },
    getItem(k: string): string | null {
      return data.get(k) ?? null;
    },
    setItem(k: string, v: string): void {
      data.set(k, v);
    },
    removeItem(k: string): void {
      data.delete(k);
    },
    clear(): void {
      data.clear();
    }
  } as Storage;
}

function makeStubStore(): {
  store: SessionStore;
  created: CreateImportedSessionInput[];
  settings: Map<string, unknown>;
} {
  const created: CreateImportedSessionInput[] = [];
  const settings = new Map<string, unknown>();
  const store: SessionStore = {
    list: async () => [],
    get: async () => undefined,
    create: async () => {
      throw new Error('not used');
    },
    createFromImport: async (input) => {
      created.push(input);
      return { ...(input as unknown as Session), id: `sess_${created.length}` };
    },
    update: async () => {},
    delete: async () => {},
    duplicate: async () => {
      throw new Error('not used');
    },
    setMedia: async () => {},
    getMedia: async () => undefined,
    getSetting: async <T>(key: string): Promise<T | undefined> =>
      settings.get(key) as T | undefined,
    setSetting: async <T>(key: string, value: T): Promise<void> => {
      settings.set(key, value);
    }
  };
  return { store, created, settings };
}

const envelope = (value: string, timestamp?: number) => JSON.stringify({ value, timestamp });

describe('discoverV1Backups', () => {
  it('finds timestamped backups and derives the millis from the key', () => {
    const storage = memoryStorage({
      'localStorageManager_oTranscribe-backup-1700000000000': envelope('<p>old</p>'),
      'localStorageManager_oTranscribe-backup-1700000005000': envelope('<p>newer</p>'),
      unrelated_key: 'ignore me'
    });
    const backups = discoverV1Backups(storage);
    expect(backups).toHaveLength(2);
    expect(backups[0]!.savedAt).toBe(1_700_000_005_000);
    expect(backups[0]!.html).toBe('<p>newer</p>');
    expect(backups[1]!.kind).toBe('backup');
  });

  it('includes the autosave envelope as a distinct kind', () => {
    const storage = memoryStorage({
      localStorageManager_autosave: envelope('<p>current</p>', 1_700_000_010_000)
    });
    const backups = discoverV1Backups(storage);
    expect(backups).toHaveLength(1);
    expect(backups[0]!.kind).toBe('autosave');
    expect(backups[0]!.savedAt).toBe(1_700_000_010_000);
  });

  it('skips corrupt envelopes without throwing', () => {
    const storage = memoryStorage({
      'localStorageManager_oTranscribe-backup-42': 'not-json',
      'localStorageManager_oTranscribe-backup-1700': envelope('<p>ok</p>')
    });
    const backups = discoverV1Backups(storage);
    expect(backups).toHaveLength(1);
    expect(backups[0]!.html).toBe('<p>ok</p>');
  });
});

describe('dumpV1Storage', () => {
  it('collects only the keys relevant to v1 backup migration', () => {
    const storage = memoryStorage({
      localStorageManager_autosave: envelope('<p>a</p>'),
      'localStorageManager_oTranscribe-backup-1': envelope('<p>b</p>'),
      'oTranscribe-language': 'en',
      'localStorageManager_oTranscribe-settings': envelope('{"shortcut":"v1"}'),
      'not-otr-related': 'skip'
    });
    const parsed = JSON.parse(dumpV1Storage(storage));
    expect(Object.keys(parsed).sort()).toEqual([
      'localStorageManager_autosave',
      'localStorageManager_oTranscribe-backup-1',
      'localStorageManager_oTranscribe-settings',
      'oTranscribe-language'
    ]);
    expect(parsed['not-otr-related']).toBeUndefined();
  });
});

describe('runV1Migration', () => {
  let stub: ReturnType<typeof makeStubStore>;

  beforeEach(() => {
    stub = makeStubStore();
    __setSessionStoreForTest(stub.store);
  });

  it('imports every backup once, then no-ops on subsequent calls', async () => {
    const storage = memoryStorage({
      'localStorageManager_oTranscribe-backup-1700000000000': envelope('<p>Reporter: hello</p>'),
      localStorageManager_autosave: envelope('<p>Current draft</p>', 1_700_000_010_000)
    });

    const first = await runV1Migration(storage);
    expect(first.migrated).toBe(true);
    expect(first.imported).toBe(2);
    expect(stub.created).toHaveLength(2);
    // Marker persisted so second run is a no-op.
    expect(stub.settings.get(V1_MIGRATED_SETTING)).toEqual(expect.any(Number));

    const second = await runV1Migration(storage);
    expect(second.migrated).toBe(false);
    expect(stub.created).toHaveLength(2);
  });

  it('records a marker even when there are no backups to import', async () => {
    const first = await runV1Migration(memoryStorage());
    expect(first.migrated).toBe(true);
    expect(first.imported).toBe(0);
    expect(stub.settings.get(V1_MIGRATED_SETTING)).toEqual(expect.any(Number));
  });
});

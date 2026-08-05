import { docFromV1Html, docToPlainText } from '$lib/editor';
import { sessionStore } from '$lib/storage';
import { detectSessionLanguage } from '$lib/i18n/language';

/**
 * v1 stored transcripts in `localStorage` via `local-storage-manager`, which
 * wraps each value in a `{ value, timestamp }` envelope keyed under
 * `localStorageManager_<originalKey>`. The keys we care about are:
 *
 * - `localStorageManager_autosave` — the current in-progress transcript. Not
 *   timestamped as a distinct backup; we treat it as the newest snapshot.
 * - `localStorageManager_oTranscribe-backup-<millis>` — timestamped backups.
 *
 * See `legacy/src/js/app/backup.js`.
 */

/** localStorage marker key set once we've imported the user's v1 data. */
export const V1_MIGRATED_SETTING = 'v1MigratedAt';

const LSM_PREFIX = 'localStorageManager_';
const BACKUP_KEY_PREFIX = `${LSM_PREFIX}oTranscribe-backup-`;
const AUTOSAVE_KEY = `${LSM_PREFIX}autosave`;

interface V1Envelope {
  value: string;
  timestamp?: number | string;
}

export interface V1Backup {
  key: string;
  html: string;
  savedAt: number;
  /** For UX: "backup" (timestamped) vs "autosave" (last known state). */
  kind: 'backup' | 'autosave';
}

/** Enumerate every v1 backup found on the given Storage. Pure — no writes. */
export function discoverV1Backups(storage: Storage): V1Backup[] {
  const found: V1Backup[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    if (key === AUTOSAVE_KEY) {
      const parsed = parseEnvelope(storage.getItem(key));
      if (parsed) {
        found.push({
          key,
          html: parsed.value,
          savedAt: envelopeTimestamp(parsed) ?? Date.now(),
          kind: 'autosave'
        });
      }
    } else if (key.startsWith(BACKUP_KEY_PREFIX)) {
      const parsed = parseEnvelope(storage.getItem(key));
      if (parsed) {
        const fromKey = Number(key.slice(BACKUP_KEY_PREFIX.length));
        found.push({
          key,
          html: parsed.value,
          savedAt: Number.isFinite(fromKey) ? fromKey : (envelopeTimestamp(parsed) ?? Date.now()),
          kind: 'backup'
        });
      }
    }
  }
  // Newest first: nicer default ordering in the library after import.
  found.sort((a, b) => b.savedAt - a.savedAt);
  return found;
}

function parseEnvelope(raw: string | null): V1Envelope | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'object' && parsed && 'value' in parsed) {
      const value = (parsed as { value: unknown }).value;
      if (typeof value === 'string') {
        return parsed as V1Envelope;
      }
    }
  } catch {
    /* corrupt or non-JSON value — skip */
  }
  return null;
}

function envelopeTimestamp(env: V1Envelope): number | null {
  const t = env.timestamp;
  if (typeof t === 'number' && Number.isFinite(t)) return t;
  if (typeof t === 'string') {
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export interface MigrationResult {
  imported: number;
  skipped: number;
  /** True when this is the first run and migration actually executed. */
  migrated: boolean;
}

/**
 * Run migration once per browser storage. Idempotent: if the marker is
 * already set, we no-op and report `migrated: false`. Runs the imports
 * sequentially so IDB back-pressure doesn't drop rows.
 */
export async function runV1Migration(
  storage: Storage | undefined = getStorage()
): Promise<MigrationResult> {
  if (!storage) return { imported: 0, skipped: 0, migrated: false };
  const store = sessionStore();
  const alreadyDone = await store.getSetting<number>(V1_MIGRATED_SETTING);
  if (typeof alreadyDone === 'number') return { imported: 0, skipped: 0, migrated: false };

  const backups = discoverV1Backups(storage);
  let imported = 0;
  let skipped = 0;
  for (const backup of backups) {
    try {
      const doc = docFromV1Html(backup.html);
      const text = docToPlainText(doc);
      const label = backup.kind === 'autosave' ? 'Autosave' : 'Backup';
      await store.createFromImport({
        title: `v1 ${label} · ${formatWhen(backup.savedAt)}`,
        text,
        textDoc: doc.toJSON(),
        language: detectSessionLanguage(),
        playbackTime: 0,
        media: { name: '', type: '', size: 0 }
      });
      imported += 1;
    } catch {
      skipped += 1;
    }
  }
  await store.setSetting(V1_MIGRATED_SETTING, Date.now());
  const result: MigrationResult = { imported, skipped, migrated: true };
  if (imported > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(V1_MIGRATION_EVENT, { detail: result }));
  }
  return result;
}

/** Fired on `window` after a migration that actually imported at least one session. */
export const V1_MIGRATION_EVENT = 'otr-v1-migration-complete';

function formatWhen(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return 'unknown date';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined') return undefined;
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Escape hatch: build a downloadable JSON dump of the raw v1 storage so users
 * can keep a copy before we alter anything. Not called by migration itself.
 */
export function dumpV1Storage(storage: Storage = getStorage() as Storage): string {
  const entries: Record<string, string> = {};
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    if (
      key === AUTOSAVE_KEY ||
      key.startsWith(BACKUP_KEY_PREFIX) ||
      key === 'oTranscribe-language' ||
      key === `${LSM_PREFIX}oTranscribe-settings`
    ) {
      const raw = storage.getItem(key);
      if (raw !== null) entries[key] = raw;
    }
  }
  return JSON.stringify(entries, null, 2);
}

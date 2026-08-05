/**
 * OPFS-backed model store.
 *
 * SPEC §3.1 requires model files live in OPFS, are downloadable with progress,
 * cancellable, verifiable against a checksum, listable with size, and deletable.
 * SPEC §7 requires checksum verification before caching.
 *
 * Each model lives under `/models/<id>.bin` in OPFS. In-progress downloads
 * write to `<id>.bin.part` first and are renamed on success (or deleted on
 * cancel / verification failure).
 */

import type { WhisperModel } from './catalog';
import { modelUrl } from './catalog';

const MODEL_DIR = 'models';
const TMP_SUFFIX = '.part';

export interface DownloadProgress {
  /** Bytes downloaded so far. */
  loaded: number;
  /** Expected total bytes (from Content-Length or catalog.approxSize). */
  total: number;
  /** `loaded / total` clamped to [0, 1]. */
  ratio: number;
}

export type DownloadEvent =
  | { type: 'start'; total: number }
  | { type: 'progress'; progress: DownloadProgress }
  | { type: 'verifying' }
  | { type: 'complete' }
  | { type: 'error'; error: unknown }
  | { type: 'canceled' };

export type DownloadListener = (event: DownloadEvent) => void;

export interface CachedModel {
  id: string;
  size: number;
}

async function opfsRoot(): Promise<FileSystemDirectoryHandle> {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
    throw new Error('OPFS unavailable in this environment');
  }
  return navigator.storage.getDirectory();
}

async function modelsDir(create = false): Promise<FileSystemDirectoryHandle> {
  const root = await opfsRoot();
  return root.getDirectoryHandle(MODEL_DIR, { create });
}

async function hexSha256(bytes: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class ModelStore {
  /** Whether a given model is fully cached in OPFS (not counting partial downloads). */
  async isCached(id: string): Promise<boolean> {
    try {
      const dir = await modelsDir();
      await dir.getFileHandle(`${id}.bin`);
      return true;
    } catch {
      return false;
    }
  }

  /** List every fully-cached model with its on-disk size. */
  async list(): Promise<CachedModel[]> {
    const dir = await modelsDir(true);
    const out: CachedModel[] = [];
    // TS lib.dom lacks proper types for FS Access API iteration; the runtime
    // shape is `for await (const [name, handle] of dir.entries())`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = (dir as any).entries?.() as AsyncIterable<[string, FileSystemHandle]>;
    if (!entries) return out;
    for await (const [name, handle] of entries) {
      if (!name.endsWith('.bin') || handle.kind !== 'file') continue;
      const file = await (handle as FileSystemFileHandle).getFile();
      out.push({ id: name.replace(/\.bin$/, ''), size: file.size });
    }
    return out;
  }

  /** Delete a cached model. Safe to call for missing entries. */
  async remove(id: string): Promise<void> {
    const dir = await modelsDir();
    for (const name of [`${id}.bin`, `${id}.bin${TMP_SUFFIX}`]) {
      try {
        await dir.removeEntry(name);
      } catch {
        // fine — nothing to remove
      }
    }
  }

  /** Read a cached model as a File so it can be handed to transcribe.js. */
  async getFile(id: string): Promise<File> {
    const dir = await modelsDir();
    const handle = await dir.getFileHandle(`${id}.bin`);
    const file = await handle.getFile();
    // Rewrap to give the file a deterministic name for transcribe.js.
    return new File([file], `${id}.bin`, { type: 'application/octet-stream' });
  }

  /**
   * Fetch a model into OPFS with cancellable progress + optional checksum
   * verification. Resolves once the file is in place; the listener sees every
   * event for UI wiring.
   */
  async download(
    model: WhisperModel,
    listener: DownloadListener,
    signal?: AbortSignal
  ): Promise<void> {
    const dir = await modelsDir(true);
    const tmpName = `${model.id}.bin${TMP_SUFFIX}`;
    const finalName = `${model.id}.bin`;

    const cleanupTmp = async () => {
      try {
        await dir.removeEntry(tmpName);
      } catch {
        /* ignore */
      }
    };

    try {
      const response = await fetch(modelUrl(model), { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${model.file}`);
      const contentLength =
        Number(response.headers.get('content-length') ?? '') || model.approxSize;

      listener({ type: 'start', total: contentLength });

      const tmpHandle = await dir.getFileHandle(tmpName, { create: true });
      // createWritable() may not exist in some restricted contexts; caller sees the error via listener.
      const writable = await tmpHandle.createWritable();
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response has no readable body');

      let loaded = 0;
      try {
        while (true) {
          if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          await writable.write(value);
          loaded += value.byteLength;
          listener({
            type: 'progress',
            progress: {
              loaded,
              total: contentLength,
              ratio: contentLength > 0 ? Math.min(1, loaded / contentLength) : 0
            }
          });
        }
        await writable.close();
      } catch (err) {
        try {
          await writable.abort();
        } catch {
          /* ignore */
        }
        throw err;
      }

      if (model.sha256) {
        listener({ type: 'verifying' });
        // Web Crypto has no streaming digest, so we re-read the file into one
        // buffer here. Practical for models up to ~1.5 GB in a modern browser;
        // if we ever pin a larger model we'll swap in a wasm streaming hasher.
        const written = await (await tmpHandle.getFile()).arrayBuffer();
        const actual = await hexSha256(written);
        if (actual !== model.sha256) {
          await cleanupTmp();
          throw new Error(
            `Checksum mismatch for ${model.id}: expected ${model.sha256}, got ${actual}`
          );
        }
      } else {
        console.warn(
          `[models] no sha256 pinned for "${model.id}" — skipping verification. This must be resolved before beta (SPEC §7).`
        );
      }

      // Move .part → final. FileSystemFileHandle has no rename in the current spec,
      // so we re-open, copy contents into the final handle, then delete the .part.
      // For MVP that's fine; the file is already fully written.
      const finalHandle = await dir.getFileHandle(finalName, { create: true });
      const source = await tmpHandle.getFile();
      const finalWritable = await finalHandle.createWritable();
      await finalWritable.write(await source.arrayBuffer());
      await finalWritable.close();
      await cleanupTmp();

      listener({ type: 'complete' });
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        await cleanupTmp();
        listener({ type: 'canceled' });
        return;
      }
      await cleanupTmp();
      listener({ type: 'error', error: err });
      throw err;
    }
  }
}

let _instance: ModelStore | null = null;
export function modelStore(): ModelStore {
  if (!_instance) _instance = new ModelStore();
  return _instance;
}

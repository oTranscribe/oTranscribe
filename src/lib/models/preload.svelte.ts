/**
 * Background preload of the default (tiny.en) Whisper model.
 *
 * SPEC §3.1: "after page load, the service worker begins fetching `tiny.en` in
 * the background from MuckRock's CDN. Progress unobtrusive; cache hits from
 * OPFS are instant."
 *
 * Reality note: the service worker doesn't perform the OPFS download itself
 * (Service Workers can't reach OPFS across scopes). We drive the fetch here on
 * the main thread and let the service worker cache the network response. The
 * `modelStore().download` write goes to OPFS, and the SW caches the same
 * response bytes for other tabs / cold reloads.
 *
 * Exposed as a Svelte 5 store so any UI (library page, transcribe panel) can
 * subscribe to the progress. No modal — it's meant to be invisible unless the
 * user actively asks to transcribe before the download finishes.
 */

import { DEFAULT_MODEL_ID, findModel } from './catalog';
import type { WhisperModel } from './catalog';
import { modelStore, type DownloadEvent } from './store';

export interface PreloadState {
  status: 'idle' | 'downloading' | 'verifying' | 'cached' | 'error' | 'canceled';
  loaded: number;
  total: number;
  modelId: string | null;
  error: string | null;
}

const initial: PreloadState = {
  status: 'idle',
  loaded: 0,
  total: 0,
  modelId: null,
  error: null
};

let state = $state<PreloadState>(initial);
let controller: AbortController | null = null;
let started = false;

/** Read-only snapshot of the preload state. Reactive when read inside effects. */
export function preloadState(): PreloadState {
  return state;
}

/**
 * Kick off the tiny.en background preload if not already running or cached.
 * Idempotent — safe to call on every navigation.
 */
export async function preloadDefaultModel(
  model: WhisperModel = findModel(DEFAULT_MODEL_ID)!
): Promise<void> {
  if (started) return;
  started = true;

  const store = modelStore();
  if (await store.isCached(model.id)) {
    state = { ...state, status: 'cached', modelId: model.id };
    return;
  }

  controller = new AbortController();
  state = {
    status: 'downloading',
    loaded: 0,
    total: model.approxSize,
    modelId: model.id,
    error: null
  };

  const listener = (event: DownloadEvent) => {
    switch (event.type) {
      case 'start':
        state = { ...state, status: 'downloading', loaded: 0, total: event.total };
        break;
      case 'progress':
        state = {
          ...state,
          status: 'downloading',
          loaded: event.progress.loaded,
          total: event.progress.total
        };
        break;
      case 'verifying':
        state = { ...state, status: 'verifying' };
        break;
      case 'complete':
        state = { ...state, status: 'cached' };
        break;
      case 'canceled':
        state = { ...state, status: 'canceled' };
        break;
      case 'error':
        state = {
          ...state,
          status: 'error',
          error: event.error instanceof Error ? event.error.message : String(event.error)
        };
        break;
    }
  };

  try {
    await store.download(model, listener, controller.signal);
  } catch {
    // Listener has already recorded the failure state.
  }
}

/** Abort an in-flight preload (rarely useful — kept for symmetry). */
export function cancelPreload(): void {
  controller?.abort();
}

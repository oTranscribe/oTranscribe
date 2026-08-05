<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { formatBytes } from '$lib/format-bytes';
  import type { EditorApi } from '$lib/editor';
  import type { WhisperModel } from '$lib/models/catalog';
  import { DEFAULT_MODEL_ID, MODEL_CATALOG, findModel, modelUrl } from '$lib/models/catalog';
  import { modelStore, type DownloadEvent } from '$lib/models/store';
  import {
    backendLabel,
    detectBackend,
    TranscribeSession,
    type TranscribeBackend,
    type TranscribeEvent
  } from '$lib/transcribe';
  import { planChunks } from './audio-chunks';

  interface Props {
    audio: Blob | null;
    initialLanguage: string;
    editorApi: EditorApi | null;
    onLanguageChange?: (language: string) => void;
  }

  let { audio, initialLanguage, editorApi, onLanguageChange }: Props = $props();

  // Snapshot the initial language for the model / language defaults — the
  // language input becomes user-controlled after mount and shouldn't be reset
  // if the parent later persists a different language. `untrack` tells Svelte
  // this is intentional so the state_referenced_locally lint doesn't fire.
  const startingLanguage = untrack(() => initialLanguage || 'auto');
  const startingIsEnglish = startingLanguage.startsWith('en');

  type PhaseIdle = { phase: 'idle' };
  type PhaseDownloading = {
    phase: 'downloading';
    loaded: number;
    total: number;
    verifying: boolean;
  };
  type PhaseInitializing = { phase: 'initializing'; ratio: number };
  type PhaseExtracting = { phase: 'extracting'; stage: 'loading' | 'running'; ratio: number };
  type PhaseDecoding = { phase: 'decoding' };
  type PhaseTranscribing = {
    phase: 'transcribing';
    chunkRatio: number;
    chunkIndex: number;
    totalChunks: number;
    segments: number;
  };
  type PhaseCanceling = { phase: 'canceling' };
  type PhaseError = { phase: 'error'; message: string };
  type PhaseComplete = { phase: 'complete'; segments: number };

  type Phase =
    | PhaseIdle
    | PhaseDownloading
    | PhaseInitializing
    | PhaseExtracting
    | PhaseDecoding
    | PhaseTranscribing
    | PhaseCanceling
    | PhaseError
    | PhaseComplete;

  let modelId = $state(startingIsEnglish ? DEFAULT_MODEL_ID : 'tiny');
  let language = $state(startingLanguage);
  let phase = $state<Phase>({ phase: 'idle' });
  let backend = $state<TranscribeBackend | null>(null);
  let cachedIds = $state<Set<string>>(new Set());
  let session: TranscribeSession | null = null;
  let downloadAbort: AbortController | null = null;
  // Set when the user cancels — the chunk loop checks this between iterations
  // so we stop launching new chunks even if the current one has already resolved.
  let userCanceled = false;

  const model = $derived(findModel(modelId) ?? MODEL_CATALOG[0]!);
  const isBusy = $derived(
    phase.phase === 'downloading' ||
      phase.phase === 'initializing' ||
      phase.phase === 'extracting' ||
      phase.phase === 'decoding' ||
      phase.phase === 'transcribing' ||
      phase.phase === 'canceling'
  );

  $effect(() => {
    void detectBackend().then((b) => (backend = b));
    void refreshCache();
  });

  onDestroy(() => {
    session?.dispose();
    downloadAbort?.abort();
  });

  async function refreshCache() {
    try {
      const list = await modelStore().list();
      cachedIds = new Set(list.map((m) => m.id));
    } catch {
      cachedIds = new Set();
    }
  }

  async function ensureModelDownloaded(target: WhisperModel): Promise<File> {
    const store = modelStore();
    if (await store.isCached(target.id)) return store.getFile(target.id);

    downloadAbort = new AbortController();
    return new Promise<File>((resolve, reject) => {
      const listener = (event: DownloadEvent) => {
        switch (event.type) {
          case 'start':
            phase = { phase: 'downloading', loaded: 0, total: event.total, verifying: false };
            break;
          case 'progress':
            phase = {
              phase: 'downloading',
              loaded: event.progress.loaded,
              total: event.progress.total,
              verifying: false
            };
            break;
          case 'verifying':
            phase = { ...(phase as PhaseDownloading), verifying: true };
            break;
          case 'canceled':
            reject(new DOMException('Download canceled', 'AbortError'));
            break;
          case 'error':
            reject(event.error instanceof Error ? event.error : new Error(String(event.error)));
            break;
          case 'complete':
            void store.getFile(target.id).then(resolve, reject);
            void refreshCache();
            break;
        }
      };
      store.download(target, listener, downloadAbort!.signal).catch(reject);
    });
  }

  async function start() {
    if (!audio) return;
    if (isBusy) return;

    userCanceled = false;
    let segments = 0;
    let detectedLanguage: string | null = null;

    try {
      const target = model;
      const modelFile = await ensureModelDownloaded(target);
      const detected = backend ?? (await detectBackend());
      backend = detected;

      phase = { phase: 'initializing', ratio: 0 };

      session = new TranscribeSession(target, modelFile, detected, (event: TranscribeEvent) => {
        switch (event.type) {
          case 'ready':
            // Nothing UI-visible — the transition to `transcribing` happens when
            // the first chunk starts (below), so single-chunk and multi-chunk
            // flows show the same status message.
            break;
          case 'progress':
            if (phase.phase === 'transcribing') {
              phase = { ...phase, chunkRatio: event.ratio };
            } else if (phase.phase === 'initializing') {
              phase = { ...phase, ratio: event.ratio };
            }
            break;
          case 'segment':
            segments += 1;
            detectedLanguage ??= event.language;
            editorApi?.appendWhisperSegment({
              start: event.segment.start,
              end: event.segment.end,
              text: event.segment.text,
              confidence: event.segment.confidence
            });
            if (phase.phase === 'transcribing') {
              phase = { ...phase, segments };
            }
            break;
          case 'canceled':
            // Handled by the loop below via `userCanceled`.
            break;
          case 'error':
            phase = {
              phase: 'error',
              message: event.error instanceof Error ? event.error.message : String(event.error)
            };
            break;
        }
      });

      await session.init();

      // Decode + chunk on the main thread. Web Audio's decode itself is async
      // and off-main-thread; the resample happens during OfflineAudioContext
      // rendering, which is also off-main-thread. For a 60-minute file the
      // peak transient memory is ~230 MB — acceptable in modern browsers.
      //
      // Video files Web Audio can't demux trigger the FFmpeg fallback inside
      // planChunks — the progress hook below flips us into the 'extracting'
      // phase so the user sees dedicated messaging.
      phase = { phase: 'decoding' };
      const plan = await planChunks(audio, undefined, {
        onProgress: (event) => {
          if (event.type === 'extract-loading') {
            phase = { phase: 'extracting', stage: 'loading', ratio: event.ratio };
          } else if (event.type === 'extract-progress') {
            phase = { phase: 'extracting', stage: 'running', ratio: event.ratio };
          }
        }
      });
      if (userCanceled) {
        phase = { phase: 'idle' };
        return;
      }

      phase = {
        phase: 'transcribing',
        chunkRatio: 0,
        chunkIndex: 0,
        totalChunks: plan.chunks.length,
        segments: 0
      };

      for (const chunk of plan.chunks) {
        if (userCanceled) break;
        phase = {
          phase: 'transcribing',
          chunkRatio: 0,
          chunkIndex: chunk.index,
          totalChunks: plan.chunks.length,
          segments
        };
        await session.transcribe(chunk.samples, {
          language,
          timeOffsetSec: chunk.startSec
        });
      }

      if (userCanceled) {
        phase = { phase: 'idle' };
      } else {
        phase = { phase: 'complete', segments };
        if (detectedLanguage && detectedLanguage !== 'unknown') {
          onLanguageChange?.(detectedLanguage);
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError' || userCanceled) {
        phase = { phase: 'idle' };
      } else {
        phase = {
          phase: 'error',
          message: err instanceof Error ? err.message : String(err)
        };
      }
    }
  }

  async function cancel() {
    if (phase.phase === 'downloading') {
      downloadAbort?.abort();
      return;
    }
    if (!session) return;
    userCanceled = true;
    phase = { phase: 'canceling' };
    await session.cancel();
  }

  const progressRatio = $derived.by(() => {
    if (phase.phase === 'downloading') {
      return phase.total > 0 ? phase.loaded / phase.total : 0;
    }
    if (phase.phase === 'initializing') return phase.ratio;
    if (phase.phase === 'extracting') return phase.ratio;
    if (phase.phase === 'transcribing') {
      // Scale per-chunk 0..1 into overall (chunkIndex + chunkRatio) / totalChunks.
      const per = 1 / Math.max(1, phase.totalChunks);
      return phase.chunkIndex * per + phase.chunkRatio * per;
    }
    return 0;
  });
</script>

<section class="panel" data-testid="transcribe-panel">
  <header>
    <h2>Transcribe</h2>
    <span class="backend" data-testid="transcribe-backend">
      {backend ? backendLabel(backend) : 'Detecting…'}
    </span>
  </header>

  <div class="controls">
    <label>
      Model
      <select
        bind:value={modelId}
        disabled={isBusy}
        data-testid="transcribe-model"
        aria-label="Whisper model"
      >
        {#each MODEL_CATALOG as m (m.id)}
          <option value={m.id}
            >{m.label} — {formatBytes(m.approxSize)}{cachedIds.has(m.id) ? ' ✓' : ''}</option
          >
        {/each}
      </select>
    </label>

    <label>
      Language
      <input
        type="text"
        bind:value={language}
        disabled={isBusy || model.coverage === 'english-only'}
        placeholder="auto"
        size="6"
        aria-label="Language code"
        data-testid="transcribe-language"
      />
    </label>

    {#if isBusy}
      <button type="button" onclick={cancel} data-testid="transcribe-cancel">Cancel</button>
    {:else}
      <button
        type="button"
        disabled={!audio}
        onclick={start}
        data-testid="transcribe-start"
        class="primary"
      >
        Transcribe
      </button>
    {/if}
  </div>

  <p class="hint">
    {model.description}
    {#if !cachedIds.has(model.id)}
      Will download ~{formatBytes(model.approxSize)} first —
      <a href={modelUrl(model)} target="_blank" rel="noopener noreferrer">source</a>.
    {/if}
  </p>

  {#if phase.phase !== 'idle'}
    <div class="status" data-testid="transcribe-status" data-phase={phase.phase}>
      <div class="progress" aria-hidden="true">
        <div class="fill" style:width="{Math.round(progressRatio * 100)}%"></div>
      </div>
      <p class="message">
        {#if phase.phase === 'downloading'}
          {#if phase.verifying}
            Verifying model checksum…
          {:else}
            Downloading model — {formatBytes(phase.loaded)} / {formatBytes(phase.total)}
          {/if}
        {:else if phase.phase === 'initializing'}
          Loading transcriber…
        {:else if phase.phase === 'extracting'}
          {#if phase.stage === 'loading'}
            Loading video decoder…
          {:else}
            Extracting audio from video…
          {/if}
        {:else if phase.phase === 'decoding'}
          Decoding audio…
        {:else if phase.phase === 'transcribing'}
          {#if phase.totalChunks > 1}
            Transcribing chunk {phase.chunkIndex + 1} of {phase.totalChunks} —
            {phase.segments} segment{phase.segments === 1 ? '' : 's'} so far
          {:else}
            Transcribing — {phase.segments} segment{phase.segments === 1 ? '' : 's'} so far
          {/if}
        {:else if phase.phase === 'canceling'}
          Canceling…
        {:else if phase.phase === 'error'}
          Error: {phase.message}
        {:else if phase.phase === 'complete'}
          Done — {phase.segments} segment{phase.segments === 1 ? '' : 's'}.
        {/if}
      </p>
    </div>
  {/if}
</section>

<style>
  .panel {
    padding: 0.75rem 1rem;
    background: var(--color-surface);
    border-radius: var(--radius-panel);
    box-shadow: var(--shadow-panel);
    display: grid;
    gap: 0.5rem;
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }
  h2 {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted, #666);
  }
  .backend {
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
    font-variant-numeric: tabular-nums;
  }
  .controls {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .controls label {
    display: grid;
    gap: 0.15rem;
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
  }
  .controls select,
  .controls input {
    font-size: 0.9rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--color-border, #ccc);
    border-radius: var(--radius-chip);
    background: white;
  }
  button {
    font-size: 0.9rem;
    padding: 0.4rem 0.9rem;
    border-radius: var(--radius-chip);
    border: 1px solid var(--color-border, #ccc);
    background: white;
    cursor: pointer;
  }
  button.primary {
    background: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .hint {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
  }
  .status {
    display: grid;
    gap: 0.35rem;
  }
  .progress {
    height: 0.35rem;
    background: var(--color-border, #eee);
    border-radius: 999px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--color-accent);
    transition: width 120ms linear;
  }
  .status[data-phase='error'] .fill {
    background: #d33;
  }
  .message {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
  }
</style>

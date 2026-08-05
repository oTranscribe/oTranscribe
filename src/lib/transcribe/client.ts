/**
 * Thin, swap-proof wrapper around transcribe.js's FileTranscriber.
 *
 * SPEC §3.1 + PLAN risk register: "Keep the worker behind our own thin TS
 * interface so a swap is bounded." Consumers on the main thread should never
 * touch @transcribe/transcriber types directly — this module is the only place.
 *
 * transcribe.js already runs whisper.cpp inside its own Emscripten pthread
 * pool. The `FileTranscriber` instance itself lives on the main thread and
 * fires callbacks there. We adapt those callbacks into a simple observer
 * shape so a future custom worker can drop in unchanged.
 */

import type { WhisperModel } from '$lib/models/catalog';
import type { TranscribeBackend } from './backend';

export interface TranscribeSegment {
  /** Segment start, in seconds (transcribe.js reports milliseconds; we convert). */
  start: number;
  /** Segment end, in seconds. */
  end: number;
  /** Whisper's per-segment text (leading space is common; consumer decides trim). */
  text: string;
  /** Average token confidence, 0..1. */
  confidence: number;
  /** Per-token records so we can attribute per-word whisper marks later. */
  tokens: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface TranscribeStartOptions {
  /** BCP-47 language code, or "auto" to let Whisper detect. */
  language: string;
  /** Whether to run translation to English on top of transcription. */
  translate?: boolean;
  /**
   * Absolute seconds to add to every segment/token timestamp before emitting.
   * The orchestrator sets this to `chunk.startSec` so downstream consumers see
   * source-relative times regardless of which chunk the segment came from.
   */
  timeOffsetSec?: number;
}

export type TranscribeEvent =
  | { type: 'ready' }
  | { type: 'progress'; ratio: number }
  | { type: 'segment'; segment: TranscribeSegment; language: string }
  | { type: 'canceled' }
  | { type: 'error'; error: unknown };

export type TranscribeListener = (event: TranscribeEvent) => void;

/**
 * A Whisper transcription session backed by transcribe.js's FileTranscriber.
 * Init once, then call `transcribe()` any number of times — required for the
 * chunked long-audio path so we don't reload the model per chunk.
 */
export class TranscribeSession {
  private disposed = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transcriber: any = null;
  private currentOffsetSec = 0;

  constructor(
    private readonly model: WhisperModel,
    private readonly modelFile: File,
    private readonly backend: TranscribeBackend,
    private readonly listener: TranscribeListener
  ) {}

  /**
   * Load the WASM module + model file. Must be called from within a user
   * gesture handler because @transcribe/transcriber creates an AudioContext.
   */
  async init(): Promise<void> {
    if (this.disposed) throw new Error('Session disposed');
    if (this.transcriber) return;

    const [{ FileTranscriber }, createModule] = await Promise.all([
      import('@transcribe/transcriber'),
      loadShoutCreateModule(this.backend)
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      createModule,
      model: this.modelFile,
      onReady: () => this.listener({ type: 'ready' }),
      onProgress: (n: number) => this.listener({ type: 'progress', ratio: n / 100 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSegment: (raw: any) => this.emitSegment(raw),
      onCanceled: () => this.listener({ type: 'canceled' })
    };
    if (this.model.dtwType) options.dtwType = this.model.dtwType;

    this.transcriber = new FileTranscriber(options);
    await this.transcriber.init();

    // Neutralize @transcribe/transcriber's `_loadAudio` decode step. Upstream
    // implementation (utils.js:audioFileToPcm32) creates a fresh AudioContext
    // per call and never closes it. Chrome caps concurrent AudioContexts around
    // 6; from chunk ~2 onwards, decodeAudioData throws, the upstream catch
    // returns `null`, and Whisper reads stale WASM memory as PCM — bind_transcribe
    // still prints its expected sample count but no segments emit (2026-08-08
    // second-chunk hang). We already have Float32 PCM in hand via `planChunks`,
    // so we short-circuit the decode: hand the PCM through verbatim.
    this.transcriber._loadAudio = async (pcm: Float32Array): Promise<Float32Array> => pcm;
  }

  /**
   * Run one transcription pass over raw 16 kHz mono float32 PCM. Reentrant —
   * call once per chunk in the chunked long-audio flow. `timeOffsetSec` shifts
   * every emitted segment/token so the caller receives source-absolute times.
   *
   * We accept PCM (not a File/Blob) because the upstream FileTranscriber's
   * file→PCM decode step leaks AudioContexts and silently drops audio on
   * subsequent calls; see `init()`.
   */
  async transcribe(pcm: Float32Array, options: TranscribeStartOptions): Promise<void> {
    if (this.disposed) throw new Error('Session disposed');
    if (!this.transcriber) throw new Error('Call init() before transcribe()');

    this.currentOffsetSec = options.timeOffsetSec ?? 0;

    try {
      // FileTranscriber.transcribe(audio) forwards `audio` to our replaced
      // `_loadAudio`, which is the identity function — so passing PCM here is
      // handed straight into Whisper's WASM without a decode round-trip.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.transcriber.transcribe(pcm as any, {
        lang: options.language || 'auto',
        translate: options.translate ?? false,
        token_timestamps: true,
        split_on_word: false
      });
    } catch (err) {
      // transcribe.js resolves the transcribe() promise on cancel too, but we
      // still surface any thrown error via the listener before rethrowing.
      this.listener({ type: 'error', error: err });
      throw err;
    }
  }

  /** Signal cancellation. The listener will see { type: 'canceled' } when it's done. */
  async cancel(): Promise<void> {
    if (!this.transcriber || this.disposed) return;
    await this.transcriber.cancel();
  }

  /** Tear down and free WASM memory. Safe to call multiple times. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.transcriber?.destroy?.();
    } catch {
      // best-effort
    }
    this.transcriber = null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emitSegment(raw: any): void {
    const event = adaptSegment(raw, this.currentOffsetSec);
    if (event) this.listener(event);
  }
}

/**
 * Pure adapter from transcribe.js's raw segment shape to our TranscribeEvent.
 * Extracted for testability — the file transcriber's segment callback is
 * awkward to drive from a unit test, but this reducer is not.
 */
export function adaptSegment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any,
  timeOffsetSec = 0
): (TranscribeEvent & { type: 'segment' }) | null {
  const seg = raw?.segment;
  if (!seg) return null;
  // transcribe.js expresses offsets in milliseconds; the editor speaks seconds.
  const start = (seg.offsets?.from ?? 0) / 1000 + timeOffsetSec;
  const end = (seg.offsets?.to ?? 0) / 1000 + timeOffsetSec;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokens: TranscribeSegment['tokens'] = (seg.tokens ?? []).map((t: any) => ({
    text: t.text ?? '',
    start: (t.offsets?.from ?? seg.offsets?.from ?? 0) / 1000 + timeOffsetSec,
    end: (t.offsets?.to ?? seg.offsets?.to ?? 0) / 1000 + timeOffsetSec,
    confidence: typeof t.p === 'number' ? t.p : 1
  }));
  return {
    type: 'segment',
    segment: {
      start,
      end,
      text: seg.text ?? '',
      confidence: averageConfidence(tokens),
      tokens
    },
    language: raw.result?.language ?? 'unknown'
  };
}

function averageConfidence(tokens: TranscribeSegment['tokens']): number {
  if (!tokens.length) return 1;
  const sum = tokens.reduce(
    (acc, t) => acc + (Number.isFinite(t.confidence) ? t.confidence : 1),
    0
  );
  return sum / tokens.length;
}

/**
 * Dynamically import the correct @transcribe/shout build for the backend.
 * Specifiers are static literals so Vite resolves them via its node_modules
 * resolver and rewrites them to real URLs — a bare specifier reaching the
 * browser at runtime would fail with "Failed to resolve module specifier".
 */
async function loadShoutCreateModule(
  backend: TranscribeBackend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<(moduleArg?: object) => Promise<any>> {
  if (backend === 'wasm-single') {
    // Non-SIMD fallback. The sub-path has no bundled types; see the shim.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import('./shout-no-simd')) as { default: any };
    return mod.default;
  }
  // Default: SIMD + pthreads.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = (await import('@transcribe/shout')) as { default: any };
  return mod.default;
}

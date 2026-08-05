/**
 * Video-file audio extraction via FFmpeg.wasm. Lazy-loaded on first use.
 *
 * The bulk of Phase 6 is here: journalists routinely record interviews on
 * phones (mp4 h.264/aac) or webinar platforms (mkv, mov). Web Audio's
 * `decodeAudioData` handles some of these in Chrome but is unreliable across
 * Firefox and Safari. FFmpeg gives us a codec-coverage floor.
 *
 * Cost: ~31 MB WASM core + JS glue on first extraction; cached by the
 * browser after that. Code-split so this whole module is only fetched when
 * a caller reaches for it.
 */

/**
 * Progress events emitted during a single extraction. `loading` fires while
 * the FFmpeg core binaries download for the first time; `extracting` fires
 * during the ffmpeg run itself. Ratios are 0..1.
 */
export type ExtractEvent =
  | { type: 'loading'; ratio: number }
  | { type: 'extracting'; ratio: number }
  | { type: 'done' }
  | { type: 'error'; error: unknown };

export type ExtractListener = (event: ExtractEvent) => void;

const OUTPUT_NAME = 'output.wav';

/**
 * Extract a 16 kHz mono PCM WAV from any container FFmpeg can demux. Returns
 * a Blob that the caller can hand to Web Audio's `decodeAudioData` — same
 * downstream code path as an audio file, so chunking + Whisper are unchanged.
 *
 * The FFmpeg instance is cached across calls in the module: cold-start is
 * expensive, subsequent calls reuse it.
 */
export async function extractAudio(
  source: Blob,
  listener?: ExtractListener,
  signal?: AbortSignal
): Promise<Blob> {
  try {
    listener?.({ type: 'loading', ratio: 0 });
    const ffmpeg = await ensureFFmpeg((r) => listener?.({ type: 'loading', ratio: r }));
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');

    const inputName = pickInputName(source);
    const { fetchFile } = await utilModule();
    await ffmpeg.writeFile(inputName, await fetchFile(source));

    // Track progress from the FFmpeg run. `on('progress')` fires with a 0..1
    // ratio derived from `-progress` output.
    const onProgress = ({ progress }: { progress: number }) =>
      listener?.({ type: 'extracting', ratio: Math.max(0, Math.min(1, progress)) });
    ffmpeg.on('progress', onProgress);

    try {
      // -vn drops the video stream; PCM s16 mono @ 16 kHz matches Whisper's
      // native input rate so the downstream Web Audio pass has less to do.
      await ffmpeg.exec([
        '-i',
        inputName,
        '-vn',
        '-acodec',
        'pcm_s16le',
        '-ar',
        '16000',
        '-ac',
        '1',
        OUTPUT_NAME
      ]);
    } finally {
      ffmpeg.off('progress', onProgress);
    }
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');

    const data = await ffmpeg.readFile(OUTPUT_NAME);
    // Free FFmpeg's virtual FS entries before we return so subsequent
    // extractions don't accumulate memory.
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(OUTPUT_NAME).catch(() => {});

    // Under COOP/COEP the FFmpeg core returns Uint8Array views backed by
    // SharedArrayBuffer. Copy into a plain ArrayBuffer before wrapping in a
    // Blob — SAB-backed views aren't structured-cloneable into a Blob body
    // and TypeScript's Blob typings reject them anyway.
    const bytes =
      data instanceof Uint8Array ? copyToArrayBuffer(data) : new TextEncoder().encode(data);
    const blob = new Blob([bytes], { type: 'audio/wav' });
    listener?.({ type: 'done' });
    // Free FFmpeg's workers + WASM heap before we return. Whisper's threaded
    // build spawns its own Emscripten pthread pool on init; leaving FFmpeg's
    // pool alive starved Whisper of workers (or shared-memory pages) and it
    // hung immediately after `encoder_begin_callback` — see the 2026-08-09
    // video-transcribe hang. Terminating here is idempotent; the next
    // extraction re-loads FFmpeg from cache (fast — assets stay in the SW).
    disposeFFmpeg();
    return blob;
  } catch (error) {
    listener?.({ type: 'error', error });
    // Ensure we don't leak an FFmpeg instance on the error path either.
    disposeFFmpeg();
    throw error;
  }
}

function copyToArrayBuffer(source: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(source.byteLength);
  new Uint8Array(out).set(source);
  return out;
}

/**
 * Pick an input filename FFmpeg will demux correctly. Extension matters —
 * FFmpeg's virtual FS uses it to pick a demuxer when it can't sniff.
 */
function pickInputName(source: Blob): string {
  if (source instanceof File && source.name) {
    const dot = source.name.lastIndexOf('.');
    if (dot > 0) return `input${source.name.slice(dot)}`;
  }
  const type = source.type || '';
  if (type.includes('mp4') || type.includes('quicktime')) return 'input.mp4';
  if (type.includes('webm')) return 'input.webm';
  if (type.includes('matroska')) return 'input.mkv';
  if (type.includes('ogg')) return 'input.ogg';
  if (type.includes('wav')) return 'input.wav';
  if (type.includes('mpeg')) return 'input.mp3';
  return 'input.bin';
}

type FFmpegLike = {
  load: (opts: { coreURL: string; wasmURL: string; workerURL: string }) => Promise<boolean>;
  writeFile: (name: string, data: Uint8Array) => Promise<boolean>;
  readFile: (name: string) => Promise<Uint8Array | string>;
  deleteFile: (name: string) => Promise<boolean>;
  exec: (args: string[]) => Promise<number>;
  terminate: () => void;
  on: (event: string, listener: (payload: { progress: number }) => void) => void;
  off: (event: string, listener: (payload: { progress: number }) => void) => void;
};

let ffmpegInstance: FFmpegLike | null = null;
let ffmpegLoad: Promise<FFmpegLike> | null = null;

async function ensureFFmpeg(onLoadingRatio: (r: number) => void): Promise<FFmpegLike> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoad) return ffmpegLoad;
  ffmpegLoad = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await utilModule();
    const [coreUrl, wasmUrl, workerUrl] = await coreAssetUrls();
    onLoadingRatio(0.1);
    const instance = new FFmpeg();
    // We proxy every asset through a same-origin blob URL: with COOP/COEP the
    // FFmpeg worker refuses cross-origin script/wasm imports, and the blob URL
    // inherits our origin.
    const [coreBlob, wasmBlob, workerBlob] = await Promise.all([
      toBlobURL(coreUrl, 'text/javascript'),
      toBlobURL(wasmUrl, 'application/wasm'),
      toBlobURL(workerUrl, 'text/javascript')
    ]);
    onLoadingRatio(0.6);
    await instance.load({ coreURL: coreBlob, wasmURL: wasmBlob, workerURL: workerBlob });
    onLoadingRatio(1);
    ffmpegInstance = instance as unknown as FFmpegLike;
    return ffmpegInstance;
  })();
  return ffmpegLoad;
}

/**
 * Resolve the three FFmpeg core asset URLs from the multi-threaded (core-mt)
 * package. We use `?url` so Vite emits the assets into the build output as
 * static files, hashed and served at same-origin — no unpkg fetch, no CORP
 * headers to negotiate. The subpaths match `@ffmpeg/core-mt`'s `exports`
 * field (`.`, `./wasm`, `./worker`).
 */
async function coreAssetUrls(): Promise<[string, string, string]> {
  const [core, wasm, worker] = await Promise.all([
    import('@ffmpeg/core-mt?url').then((m) => m.default as string),
    import('@ffmpeg/core-mt/wasm?url').then((m) => m.default as string),
    import('@ffmpeg/core-mt/worker?url').then((m) => m.default as string)
  ]);
  return [core, wasm, worker];
}

async function utilModule() {
  return await import('@ffmpeg/util');
}

function disposeFFmpeg(): void {
  const instance = ffmpegInstance;
  ffmpegInstance = null;
  ffmpegLoad = null;
  if (!instance) return;
  try {
    instance.terminate();
  } catch {
    /* best effort — the whole point of terminate is cleanup */
  }
}

/**
 * Test seam: drop the cached instance so unit tests can inject a stub via
 * `__setFFmpegForTest`. Not part of the public API.
 */
export function __resetFFmpegForTest(instance: FFmpegLike | null = null): void {
  ffmpegInstance = instance;
  ffmpegLoad = null;
}

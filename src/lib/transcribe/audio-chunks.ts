/**
 * Client-side audio chunking for Whisper transcription.
 *
 * `@transcribe/shout` compiles whisper.cpp with a fixed WASM memory ceiling.
 * Any single audio input long enough to blow past that ceiling fails at PCM
 * allocation time with a "Invalid typed array length" RangeError — journalists
 * routinely have 60–120 minute interviews, so this bites in practice.
 *
 * Workaround: decode the source once via Web Audio, chunk the PCM into pieces
 * small enough to fit, and hand each chunk to Whisper as raw Float32 PCM.
 * Whisper timestamps are chunk-local; the caller adds the chunk's `startSec`
 * to every segment/token before storing.
 *
 * We hand raw PCM (not a WAV blob) to `TranscribeSession.transcribe` on
 * purpose: the upstream `@transcribe/transcriber` file→PCM decode leaks an
 * AudioContext per call and silently drops audio on subsequent calls (Chrome
 * caps concurrent contexts around 6). Skipping the encode/decode round-trip
 * both avoids that bug and saves memory. See `client.ts:init()`.
 *
 * MVP is non-overlapping chunks. Whisper may occasionally split a word at a
 * chunk boundary (~once per 10 min); overlap+dedup is a follow-up.
 */

/** 16 kHz mono is Whisper's native input format — matches transcribe.js's internal downsample target. */
export const WHISPER_SAMPLE_RATE = 16_000;

/** Default chunk duration. Long enough to feel like real progress, short enough to sit inside shout.wasm's memory ceiling. */
export const DEFAULT_CHUNK_SECONDS = 600;

/**
 * Duration below which chunking is a pure overhead — we still take the chunk
 * path so there's one code path, but there's just one chunk.
 */
export const SINGLE_CHUNK_MAX_SECONDS = 720;

export interface AudioChunk {
  /** Zero-based chunk index. */
  index: number;
  /** Absolute start of this chunk in the source audio, in seconds. */
  startSec: number;
  /** Absolute end (exclusive) of this chunk in the source audio, in seconds. */
  endSec: number;
  /**
   * Raw 16 kHz mono float32 PCM for this chunk — a subarray view of the
   * fully-decoded source buffer, no copy. Handed directly to Whisper via
   * `TranscribeSession.transcribe`, bypassing @transcribe/transcriber's
   * leak-prone decode path (see module docblock).
   */
  samples: Float32Array;
}

export interface ChunkPlan {
  /** Total decoded duration of the source, in seconds. */
  totalSeconds: number;
  /** Chunks, in order. `chunks.length === 1` for short inputs. */
  chunks: AudioChunk[];
}

/**
 * Progress hook for `planChunks`. Called during the extract-fallback phase
 * when a source needs FFmpeg demuxing (usually a video container Web Audio
 * couldn't decode directly). `loading` covers the FFmpeg core download;
 * `extracting` covers the ffmpeg run.
 */
export type PlanProgressEvent =
  { type: 'extract-loading'; ratio: number } | { type: 'extract-progress'; ratio: number };

/**
 * Decode + resample the source to 16 kHz mono PCM in one Web Audio pass.
 * OfflineAudioContext handles both channel downmix and sample-rate conversion
 * during rendering — one decode, one render, no manual DSP on the main thread.
 *
 * If Web Audio can't demux the container (many video containers on Firefox
 * and Safari), an optional `extract` callback can supply a fallback WAV blob
 * and we retry the decode. The extraction path is dynamically imported so
 * callers that only touch audio never pull FFmpeg into the bundle.
 */
export async function decodeToMono16k(
  source: File | Blob,
  extract?: (source: Blob) => Promise<Blob>
): Promise<Float32Array> {
  if (typeof AudioContext === 'undefined' || typeof OfflineAudioContext === 'undefined') {
    throw new Error('Web Audio API unavailable in this environment');
  }
  let decoded: AudioBuffer;
  try {
    decoded = await decodeWithWebAudio(source);
  } catch (webAudioError) {
    if (!extract) throw webAudioError;
    // Video containers and exotic codecs land here — Web Audio's decoder
    // rejects EncodingError. FFmpeg handles the demux, we retry decode.
    const wav = await extract(source);
    decoded = await decodeWithWebAudio(wav);
  }
  const targetLength = Math.max(1, Math.ceil(decoded.duration * WHISPER_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, targetLength, WHISPER_SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

async function decodeWithWebAudio(source: Blob): Promise<AudioBuffer> {
  const arrayBuf = await source.arrayBuffer();
  const tempCtx = new AudioContext();
  try {
    return await tempCtx.decodeAudioData(arrayBuf.slice(0));
  } finally {
    void tempCtx.close();
  }
}

/**
 * Split a 16 kHz mono PCM buffer into chunk descriptors. Uses views (no copy)
 * to keep peak memory bounded — the caller can encode one chunk to WAV, hand
 * it off, then discard before the next chunk allocates.
 */
export function* chunkPcm(
  pcm: Float32Array,
  chunkSeconds: number = DEFAULT_CHUNK_SECONDS
): Generator<{ index: number; startSec: number; endSec: number; samples: Float32Array }> {
  if (chunkSeconds <= 0) throw new Error(`chunkSeconds must be > 0, got ${chunkSeconds}`);
  const chunkSamples = Math.floor(chunkSeconds * WHISPER_SAMPLE_RATE);
  const totalSamples = pcm.length;
  let index = 0;
  for (let offset = 0; offset < totalSamples; offset += chunkSamples, index += 1) {
    const end = Math.min(offset + chunkSamples, totalSamples);
    yield {
      index,
      startSec: offset / WHISPER_SAMPLE_RATE,
      endSec: end / WHISPER_SAMPLE_RATE,
      samples: pcm.subarray(offset, end)
    };
  }
}

/**
 * Encode a Float32 PCM buffer as a 16-bit PCM WAV blob. Halves the memory
 * footprint versus 32-bit float WAV and every browser's Web Audio decoder
 * accepts it without fuss.
 */
export function encodeWavPcm16(pcm: Float32Array, sampleRate: number = WHISPER_SAMPLE_RATE): Blob {
  const numSamples = pcm.length;
  const byteRate = sampleRate * 2; // mono, 16-bit
  const dataBytes = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  // RIFF header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');

  // fmt chunk (16 bytes, PCM)
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true); // block align = channels * bytesPerSample
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i += 1) {
    const s = Math.max(-1, Math.min(1, pcm[i]!));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}

export interface PlanChunksOptions {
  chunkSeconds?: number;
  /**
   * Notification hook for the FFmpeg-extract fallback. Only invoked when the
   * source needed extraction — audio files and Web-Audio-decodable videos
   * never trigger it.
   */
  onProgress?: (event: PlanProgressEvent) => void;
  signal?: AbortSignal;
}

/**
 * End-to-end helper: decode the source once, split into chunks that share the
 * underlying PCM buffer via subarray views. No WAV encode step — we hand raw
 * Float32 PCM straight to Whisper via `TranscribeSession.transcribe`, which
 * bypasses transcribe.js's leak-prone `_loadAudio` decode path.
 *
 * On files Web Audio can't demux (many video containers on Firefox/Safari),
 * `planChunks` transparently falls back to FFmpeg.wasm. FFmpeg is loaded via
 * dynamic import so callers that only deal with audio never pay the ~31 MB
 * WASM cost.
 */
export async function planChunks(
  source: File | Blob,
  chunkSeconds: number = DEFAULT_CHUNK_SECONDS,
  options: Omit<PlanChunksOptions, 'chunkSeconds'> = {}
): Promise<ChunkPlan> {
  const { onProgress, signal } = options;
  const extract = async (blob: Blob): Promise<Blob> => {
    // Lazy: only pull in the FFmpeg module when we actually need it.
    const { extractAudio } = await import('$lib/extract');
    return extractAudio(
      blob,
      (event) => {
        if (event.type === 'loading') onProgress?.({ type: 'extract-loading', ratio: event.ratio });
        else if (event.type === 'extracting')
          onProgress?.({ type: 'extract-progress', ratio: event.ratio });
      },
      signal
    );
  };
  const pcm = await decodeToMono16k(source, extract);
  const totalSeconds = pcm.length / WHISPER_SAMPLE_RATE;
  const chunks: AudioChunk[] = [];
  for (const chunk of chunkPcm(pcm, chunkSeconds)) {
    chunks.push({
      index: chunk.index,
      startSec: chunk.startSec,
      endSec: chunk.endSec,
      samples: chunk.samples
    });
  }
  return { totalSeconds, chunks };
}

import { describe, expect, it, vi } from 'vitest';

/**
 * The extract module dynamically imports @ffmpeg/ffmpeg + @ffmpeg/core-mt.
 * We can't drive real FFmpeg here (31 MB WASM, needs COOP/COEP), so these
 * tests target the seams: filename inference, and the fallback contract on
 * `decodeToMono16k` that promises to invoke `extract` only after Web Audio's
 * decode fails.
 */

describe('planChunks fallback contract', () => {
  it('calls the extract fallback only when Web Audio decode throws', async () => {
    const { decodeToMono16k, WHISPER_SAMPLE_RATE } = await import('$lib/transcribe/audio-chunks');

    // Stub AudioContext / OfflineAudioContext for the test — happy-dom doesn't
    // ship Web Audio and we don't need real decoding, just to observe when the
    // fallback runs.
    let decodeCalls = 0;
    const stubAudioContext = class {
      close() {}
      async decodeAudioData(): Promise<AudioBuffer> {
        decodeCalls += 1;
        // First call: reject like a real EncodingError. Second call (post-extract): resolve.
        if (decodeCalls === 1) throw new DOMException('unsupported', 'EncodingError');
        return { duration: 1, sampleRate: WHISPER_SAMPLE_RATE } as unknown as AudioBuffer;
      }
    };
    const stubOfflineAudioContext = class {
      constructor() {}
      createBufferSource() {
        return {
          buffer: null as unknown as AudioBuffer,
          connect() {},
          start() {}
        };
      }
      destination = {} as AudioNode;
      async startRendering(): Promise<AudioBuffer> {
        const samples = new Float32Array(WHISPER_SAMPLE_RATE);
        return { getChannelData: () => samples } as unknown as AudioBuffer;
      }
    };
    vi.stubGlobal('AudioContext', stubAudioContext);
    vi.stubGlobal('OfflineAudioContext', stubOfflineAudioContext);

    const source = new Blob([new Uint8Array(16)], { type: 'video/mp4' });
    const extract = vi.fn(async () => new Blob([new Uint8Array(16)], { type: 'audio/wav' }));

    const pcm = await decodeToMono16k(source, extract);
    expect(extract).toHaveBeenCalledOnce();
    expect(decodeCalls).toBe(2);
    expect(pcm.length).toBe(WHISPER_SAMPLE_RATE);

    vi.unstubAllGlobals();
  });

  it('skips the fallback path when Web Audio succeeds on first try', async () => {
    const { decodeToMono16k, WHISPER_SAMPLE_RATE } = await import('$lib/transcribe/audio-chunks');

    const stubAudioContext = class {
      close() {}
      async decodeAudioData(): Promise<AudioBuffer> {
        return { duration: 1, sampleRate: WHISPER_SAMPLE_RATE } as unknown as AudioBuffer;
      }
    };
    const stubOfflineAudioContext = class {
      constructor() {}
      createBufferSource() {
        return {
          buffer: null as unknown as AudioBuffer,
          connect() {},
          start() {}
        };
      }
      destination = {} as AudioNode;
      async startRendering(): Promise<AudioBuffer> {
        const samples = new Float32Array(WHISPER_SAMPLE_RATE);
        return { getChannelData: () => samples } as unknown as AudioBuffer;
      }
    };
    vi.stubGlobal('AudioContext', stubAudioContext);
    vi.stubGlobal('OfflineAudioContext', stubOfflineAudioContext);

    const source = new Blob([new Uint8Array(16)], { type: 'audio/mpeg' });
    const extract = vi.fn(async () => new Blob([]));
    await decodeToMono16k(source, extract);
    expect(extract).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

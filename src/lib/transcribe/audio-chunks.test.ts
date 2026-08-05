import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHUNK_SECONDS,
  WHISPER_SAMPLE_RATE,
  chunkPcm,
  encodeWavPcm16
} from './audio-chunks';

function makeRamp(sampleCount: number): Float32Array {
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    out[i] = ((i % 1000) / 1000) * 2 - 1; // triangle in [-1, 1]
  }
  return out;
}

describe('chunkPcm', () => {
  it('produces a single chunk covering the whole buffer when input is shorter than chunkSeconds', () => {
    const samples = WHISPER_SAMPLE_RATE * 45; // 45s
    const pcm = new Float32Array(samples);
    const chunks = [...chunkPcm(pcm, 600)];
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.index).toBe(0);
    expect(chunks[0]!.startSec).toBe(0);
    expect(chunks[0]!.endSec).toBeCloseTo(45);
    expect(chunks[0]!.samples.length).toBe(samples);
  });

  it('splits a 25-minute buffer into three 10-minute chunks (last one shorter)', () => {
    const totalSec = 25 * 60;
    const pcm = new Float32Array(WHISPER_SAMPLE_RATE * totalSec);
    const chunks = [...chunkPcm(pcm, 600)];
    expect(chunks).toHaveLength(3);
    expect(chunks[0]!.startSec).toBe(0);
    expect(chunks[0]!.endSec).toBe(600);
    expect(chunks[1]!.startSec).toBe(600);
    expect(chunks[1]!.endSec).toBe(1200);
    expect(chunks[2]!.startSec).toBe(1200);
    // Last chunk is only 5 minutes.
    expect(chunks[2]!.endSec).toBeCloseTo(1500);
    expect(chunks[2]!.samples.length).toBe(WHISPER_SAMPLE_RATE * 300);
  });

  it('yields subarrays that share the underlying buffer (no copies)', () => {
    const pcm = new Float32Array(WHISPER_SAMPLE_RATE * 1000);
    const chunks = [...chunkPcm(pcm, 300)];
    for (const c of chunks) {
      expect(c.samples.buffer).toBe(pcm.buffer);
    }
  });

  it('rejects nonsense chunkSeconds values', () => {
    const pcm = new Float32Array(1000);
    expect(() => [...chunkPcm(pcm, 0)]).toThrow();
    expect(() => [...chunkPcm(pcm, -5)]).toThrow();
  });

  it('DEFAULT_CHUNK_SECONDS matches the panel copy (10 minutes) so a 30-minute file yields 3 chunks', () => {
    expect(DEFAULT_CHUNK_SECONDS).toBe(600);
    const pcm = new Float32Array(WHISPER_SAMPLE_RATE * 1800);
    const chunks = [...chunkPcm(pcm)];
    expect(chunks).toHaveLength(3);
  });
});

describe('AudioChunk contract', () => {
  it('carries raw PCM as a subarray view, not a WAV blob', () => {
    // Regression pin: transcribe.js's `_loadAudio` decode step leaks
    // AudioContexts and silently drops audio on subsequent calls (2026-08-08
    // second-chunk hang). We fixed that by passing raw PCM through to Whisper.
    // The AudioChunk shape must not regress back to WAV blobs.
    const pcm = new Float32Array(WHISPER_SAMPLE_RATE * 15);
    const chunks = [...chunkPcm(pcm, 10)];
    for (const c of chunks) {
      // `samples` is a Float32Array — not a Blob, not undefined.
      expect(c.samples).toBeInstanceOf(Float32Array);
      // Zero-copy: `samples.buffer` is the same underlying buffer as `pcm`.
      expect(c.samples.buffer).toBe(pcm.buffer);
    }
  });
});

describe('encodeWavPcm16', () => {
  it('writes a valid 44-byte PCM WAV header for a mono 16 kHz buffer', async () => {
    const pcm = makeRamp(WHISPER_SAMPLE_RATE * 2); // 2 s
    const blob = encodeWavPcm16(pcm);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + pcm.length * 2);

    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    const ascii = (o: number, n: number) =>
      Array.from({ length: n }, (_, i) => String.fromCharCode(view.getUint8(o + i))).join('');
    expect(ascii(0, 4)).toBe('RIFF');
    expect(ascii(8, 4)).toBe('WAVE');
    expect(ascii(12, 4)).toBe('fmt ');
    // fmt sub-chunk size = 16, format = 1 (PCM), channels = 1
    expect(view.getUint32(16, true)).toBe(16);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    // sample rate + byte rate
    expect(view.getUint32(24, true)).toBe(WHISPER_SAMPLE_RATE);
    expect(view.getUint32(28, true)).toBe(WHISPER_SAMPLE_RATE * 2);
    // block align 2, bits per sample 16
    expect(view.getUint16(32, true)).toBe(2);
    expect(view.getUint16(34, true)).toBe(16);
    expect(ascii(36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(pcm.length * 2);
  });

  it('clamps out-of-range floats before quantizing to int16', async () => {
    const pcm = new Float32Array([-2, -1, 0, 1, 2]);
    const blob = encodeWavPcm16(pcm);
    const view = new DataView(await blob.arrayBuffer());
    // int16 samples start at offset 44
    expect(view.getInt16(44, true)).toBe(-32768); // -2 → clamped to -1 → -32768
    expect(view.getInt16(46, true)).toBe(-32768); // -1 → -32768
    expect(view.getInt16(48, true)).toBe(0);
    expect(view.getInt16(50, true)).toBe(32767); // 1 → 32767
    expect(view.getInt16(52, true)).toBe(32767); // 2 → clamped
  });
});

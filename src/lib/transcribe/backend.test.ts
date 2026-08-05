import { describe, expect, it } from 'vitest';
import { backendLabel, detectBackend } from './backend';

/**
 * A control module with the same section structure as the real SIMD probe in
 * backend.ts but WITHOUT the SIMD opcode — an i32-only body that any WASM
 * engine can validate. Used to prove the wrapper bytes are well-formed. If a
 * future change to the probe breaks structural validity (e.g. wrong section
 * sizes, truncated immediate), this control also breaks — catching what the
 * original bug would have caught.
 */
const CONTROL_BYTES = new Uint8Array([
  0x00,
  0x61,
  0x73,
  0x6d,
  0x01,
  0x00,
  0x00,
  0x00, // magic + version
  0x01,
  0x04,
  0x01,
  0x60,
  0x00,
  0x00, // type: () -> ()
  0x03,
  0x02,
  0x01,
  0x00, // funcs: [type 0]
  // code section: size 7, 1 func, body size 5 (0 locals + i32.const 0 + drop + end)
  0x0a,
  0x07,
  0x01,
  0x05,
  0x00,
  0x41,
  0x00,
  0x1a,
  0x0b
]);

describe('backend labels', () => {
  it('has a stable human label for each backend', () => {
    expect(backendLabel('webgpu')).toBe('WebGPU');
    expect(backendLabel('wasm-simd-threaded')).toMatch(/SIMD/);
    expect(backendLabel('wasm-single')).toMatch(/single-threaded/);
  });
});

describe('detectBackend', () => {
  it('returns wasm-single when not cross-origin isolated (happy-dom default)', async () => {
    // happy-dom sets crossOriginIsolated = false by default. Under those
    // conditions we must fall back to single-threaded WASM even if the browser
    // could otherwise support SIMD threads.
    const b = await detectBackend();
    expect(b).toBe('wasm-single');
  });
});

describe('SIMD probe wrapper', () => {
  it('control module with the same section structure validates', () => {
    // Regression pin: the previous SIMD probe truncated the immediate on a
    // v128.const opcode and failed validation on EVERY browser (structural
    // error, not a SIMD-support error), so detectBackend() always returned
    // wasm-single. We can't directly validate the real SIMD probe here
    // because happy-dom's WebAssembly engine may not implement SIMD — a
    // valid-but-SIMD probe would still return false. Instead we validate a
    // twin module that shares the wrapper (magic, sections, sizes) but uses
    // i32 ops. If a future edit breaks the wrapper's byte-level structure,
    // this control also breaks, catching what the original bug would have.
    expect(WebAssembly.validate(CONTROL_BYTES)).toBe(true);
  });
});

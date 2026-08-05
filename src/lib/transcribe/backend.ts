/**
 * Backend detection for the transcribe.js Whisper worker.
 *
 * SPEC §3.1: "prefer WebGPU where available; fall back to WASM SIMD threads;
 * fall back again to single-threaded WASM. Detected at load time; the UI
 * indicates which backend is active."
 *
 * Reality (2026-08): transcribe.js's `@transcribe/shout` publishes two builds —
 * `shout.wasm.js` (SIMD + pthreads) and `shout.wasm_no-simd.js` (fallback). It
 * has no WebGPU backend today. We still expose a "webgpu" enum value so the UI
 * copy stays truthful once transcribe.js (or a swap-in wrapper) supports it.
 */

export type TranscribeBackend = 'webgpu' | 'wasm-simd-threaded' | 'wasm-single';

function isCrossOriginIsolated(): boolean {
  return typeof crossOriginIsolated === 'boolean' ? crossOriginIsolated : false;
}

/**
 * Feature-test WASM SIMD by validating a module that uses an `i32x4.splat`
 * instruction (opcode 0xfd 0x0f). Cached — the answer never changes in a given
 * browser session.
 *
 * The probe below is the canonical sequence used by wasm-feature-detect:
 * a module declaring `() -> v128`, whose body executes `i32.const 0;
 * i32x4.splat; drop`. On SIMD-supporting engines it parses cleanly; on
 * non-SIMD engines the 0xfd prefix is rejected as an unknown opcode.
 *
 * NB: The previous probe here was malformed — it truncated the immediate on a
 * `v128.const` opcode, so it failed structural validation *on every browser*
 * regardless of SIMD support. Result: `detectBackend()` always returned
 * `wasm-single`, and users on Chrome/Firefox loaded `shout.wasm_no-simd.js`
 * for a 2–3× slowdown on transcription. Regression pinned by a unit test.
 */
let _simdCache: boolean | null = null;
async function hasWasmSimd(): Promise<boolean> {
  if (_simdCache !== null) return _simdCache;
  // Byte-by-byte breakdown:
  //   magic (\0asm) + version 1                        : 8 bytes
  //   type section:  1 type, () -> v128                : 7 bytes
  //   function section: 1 func of type 0               : 4 bytes
  //   code section: 1 func, body = i32.const 0 ;
  //                              i32x4.splat (0xfd 0x0f) ;
  //                              end                   : 10 bytes
  //   Body has no `drop`, so the v128 produced by splat matches the return
  //   type. That means validation succeeds if AND ONLY IF the engine
  //   recognizes the SIMD opcode — exactly what we want to probe.
  _simdCache = WebAssembly.validate(
    new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
      0x03, 0x02, 0x01, 0x00, 0x0a, 0x08, 0x01, 0x06, 0x00, 0x41, 0x00, 0xfd, 0x0f, 0x0b
    ])
  );
  return _simdCache;
}

/**
 * Pick the best available backend right now. Async because SIMD detection has
 * to compile a probe module. WebGPU branch is disabled until transcribe.js (or
 * our swap-in) grows one.
 */
export async function detectBackend(): Promise<TranscribeBackend> {
  if (!isCrossOriginIsolated()) {
    // Without COOP+COEP, SharedArrayBuffer is off — no pthreads, no SIMD threads.
    return 'wasm-single';
  }
  if (await hasWasmSimd()) return 'wasm-simd-threaded';
  return 'wasm-single';
}

export function backendLabel(backend: TranscribeBackend): string {
  switch (backend) {
    case 'webgpu':
      return 'WebGPU';
    case 'wasm-simd-threaded':
      return 'WASM (SIMD, threaded)';
    case 'wasm-single':
      return 'WASM (single-threaded)';
  }
}

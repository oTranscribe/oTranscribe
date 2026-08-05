/**
 * Isolation shim for the non-SIMD shout build.
 *
 * `@transcribe/shout` publishes types only for its default (SIMD) entry; the
 * no-SIMD sibling file has no `.d.ts` so a direct import trips svelte-check.
 * Re-exporting here concentrates the type suppression in one clearly labeled
 * place — the fallback for browsers/devices without WASM SIMD support.
 */

// @ts-expect-error — no types shipped for this sub-path.
export { default } from '@transcribe/shout/src/shout/shout.wasm_no-simd.js';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    if (dbs) for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
});

test('library page renders', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'oTranscribe' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your transcripts' })).toBeVisible();
});

test('library page has no detectable a11y violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('service worker takes control on second load', async ({ page }) => {
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null);
  expect(controlled).toBe(true);
});

test('page is cross-origin isolated (COOP/COEP headers active)', async ({ page }) => {
  const isolated = await page.evaluate(() => window.crossOriginIsolated);
  expect(isolated).toBe(true);
});

test('WASM SIMD probe validates in Chromium (regression pin)', async ({ page }) => {
  // Regression pin (2026-08-08): the earlier SIMD probe in backend.ts was
  // structurally malformed (truncated v128.const immediate) and silently
  // failed validation on every engine, forcing users onto the no-simd
  // fallback for ~2-3× slower transcription. This test re-runs the same
  // bytes we ship, in real Chromium. If it fails, backend detection is back
  // to always returning wasm-single.
  const isValid = await page.evaluate(() => {
    // Same bytes as backend.ts:hasWasmSimd — kept in lockstep manually.
    const bytes = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
      0x03, 0x02, 0x01, 0x00, 0x0a, 0x08, 0x01, 0x06, 0x00, 0x41, 0x00, 0xfd, 0x0f, 0x0b
    ]);
    return WebAssembly.validate(bytes);
  });
  expect(isValid).toBe(true);
});

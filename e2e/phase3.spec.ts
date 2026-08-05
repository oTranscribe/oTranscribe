import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_AUDIO = path.join(HERE, 'fixtures', 'sample-tone-10s.mp3');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    if (dbs) for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
});

async function createSession(page: Page) {
  await page.getByTestId('file-input').setInputFiles(SAMPLE_AUDIO);
  await page.waitForURL(/\/sessions\/[0-9a-f-]{36}/);
  await expect(page.locator('.ProseMirror')).toBeVisible();
}

test('transcribe panel renders with a populated model picker and backend indicator', async ({
  page
}) => {
  await createSession(page);
  await expect(page.getByTestId('transcribe-panel')).toBeVisible();
  const modelSelect = page.getByTestId('transcribe-model');
  await expect(modelSelect).toBeVisible();
  const options = await modelSelect.locator('option').allInnerTexts();
  expect(options.length).toBeGreaterThan(4);
  // Backend indicator should resolve within a second even without model download.
  const backend = page.getByTestId('transcribe-backend');
  await expect(backend).not.toHaveText('Detecting…', { timeout: 5000 });
  const label = (await backend.textContent()) ?? '';
  expect(label).toMatch(/WASM|WebGPU/i);
});

test('language input is disabled for english-only models and enabled otherwise', async ({
  page
}) => {
  await createSession(page);
  const language = page.getByTestId('transcribe-language');
  const modelSelect = page.getByTestId('transcribe-model');

  await modelSelect.selectOption('tiny.en');
  await expect(language).toBeDisabled();

  await modelSelect.selectOption('tiny');
  await expect(language).toBeEnabled();
});

test('settings page lists every catalog model with a download control', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByTestId('model-catalog')).toBeVisible();
  const rows = page.getByTestId('model-catalog').locator('li');
  const count = await rows.count();
  expect(count).toBeGreaterThan(4);
  // Every uncached model should offer a Download button.
  const downloads = await rows.getByRole('button', { name: /Download/i }).count();
  expect(downloads).toBe(count);
});

test('start button is enabled once audio is loaded', async ({ page }) => {
  await createSession(page);
  await expect(page.getByTestId('transcribe-start')).toBeEnabled();
});

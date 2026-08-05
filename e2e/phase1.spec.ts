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

async function createSessionFromSample(page: Page) {
  await page.getByTestId('file-input').setInputFiles(SAMPLE_AUDIO);
  await page.waitForURL(/\/sessions\/[0-9a-f-]{36}/);
  await expect(page.getByTestId('audio-player')).toBeVisible();
  await expect(page.locator('.ProseMirror')).toBeVisible();
  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) =>
    el.readyState >= 1
      ? Promise.resolve()
      : new Promise<void>((r) => el.addEventListener('loadedmetadata', () => r(), { once: true }))
  );
}

async function waitForSaved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 5000
  });
}

async function typeIntoEditor(page: Page, text: string) {
  const editor = page.locator('.ProseMirror').first();
  await editor.click();
  await editor.pressSequentially(text);
}

async function editorPlainText(page: Page): Promise<string> {
  return page.locator('.ProseMirror').first().innerText();
}

export { createSessionFromSample, waitForSaved, typeIntoEditor, editorPlainText };

test('upload creates a session and navigates to editor', async ({ page }) => {
  await createSessionFromSample(page);
  await expect(page.getByRole('heading', { name: 'sample-tone-10s' })).toBeVisible();
});

test('typing and playback position persist across reload', async ({ page }) => {
  await createSessionFromSample(page);

  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) => {
    el.currentTime = 3.5;
  });
  await waitForSaved(page);

  await typeIntoEditor(page, 'hello from phase 1');
  await waitForSaved(page);

  await page.reload();

  await expect(page.locator('.ProseMirror').first()).toContainText('hello from phase 1');
  const restored = await page.getByTestId('media-element').evaluate(
    (el: HTMLMediaElement) =>
      new Promise<number>((resolve) => {
        if (el.readyState >= 1) resolve(el.currentTime);
        else el.addEventListener('loadedmetadata', () => resolve(el.currentTime), { once: true });
      })
  );
  expect(restored).toBeGreaterThan(3);
  expect(restored).toBeLessThan(4);
});

test('skip forward advances playback by 1.5 seconds', async ({ page }) => {
  await createSessionFromSample(page);
  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) => {
    el.currentTime = 0;
  });
  await page.getByTestId('btn-skip-forward').click();
  const t = await media.evaluate((el: HTMLMediaElement) => el.currentTime);
  expect(t).toBeGreaterThanOrEqual(1.5);
  expect(t).toBeLessThan(1.6);
});

test('speed control moves between 0.5 and 2.5 in 0.125 steps', async ({ page }) => {
  await createSessionFromSample(page);
  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) => (el.playbackRate = 1));
  await page.getByLabel('Increase playback speed').click();
  expect(await media.evaluate((el: HTMLMediaElement) => el.playbackRate)).toBeCloseTo(1.125, 3);
  await page.getByLabel('Decrease playback speed').click();
  await page.getByLabel('Decrease playback speed').click();
  expect(await media.evaluate((el: HTMLMediaElement) => el.playbackRate)).toBeCloseTo(0.875, 3);
});

test('v2 default keymap: F1 does not skip; Ctrl+comma does', async ({ page }) => {
  await createSessionFromSample(page);
  const media = page.getByTestId('media-element');

  await media.evaluate((el: HTMLMediaElement) => (el.currentTime = 5));
  await page.keyboard.press('F1');
  await page.waitForTimeout(100);
  expect(await media.evaluate((el: HTMLMediaElement) => el.currentTime)).toBeCloseTo(5, 2);

  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+,`);
  await page.waitForTimeout(100);
  expect(await media.evaluate((el: HTMLMediaElement) => el.currentTime)).toBeCloseTo(3.5, 2);
});

test('v1 legacy keymap enables F1/F2', async ({ page }) => {
  await createSessionFromSample(page);
  await page.getByTestId('keymap-v1-checkbox').check();

  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) => (el.currentTime = 5));
  await page.keyboard.press('F1');
  await page.waitForTimeout(100);
  expect(await media.evaluate((el: HTMLMediaElement) => el.currentTime)).toBeCloseTo(3.5, 2);
  await page.keyboard.press('F2');
  await page.waitForTimeout(100);
  expect(await media.evaluate((el: HTMLMediaElement) => el.currentTime)).toBeCloseTo(5, 2);
});

test('library re-open flow: return to library, click row, resume', async ({ page }) => {
  await createSessionFromSample(page);
  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) => (el.currentTime = 2.5));
  await typeIntoEditor(page, 'reopening test');
  await waitForSaved(page);

  await page.goto('/');
  await expect(page.getByTestId('session-list')).toBeVisible();
  await page.getByTestId('session-row').first().click();
  await page.waitForURL(/\/sessions\/[0-9a-f-]{36}/);

  await expect(page.locator('.ProseMirror').first()).toContainText('reopening test');
  const restored = await page.getByTestId('media-element').evaluate(
    (el: HTMLMediaElement) =>
      new Promise<number>((r) => {
        if (el.readyState >= 1) r(el.currentTime);
        else el.addEventListener('loadedmetadata', () => r(el.currentTime), { once: true });
      })
  );
  expect(restored).toBeGreaterThan(2);
  expect(restored).toBeLessThan(3);
});

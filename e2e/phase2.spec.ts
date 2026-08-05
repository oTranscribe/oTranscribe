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

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test('insert-timestamp shortcut inserts a chip and shows formatted time', async ({ page }) => {
  await createSessionFromSample(page);
  await typeIntoEditor(page, 'The moment was ');

  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) => (el.currentTime = 4));

  await page.keyboard.press(`${mod}+;`);

  const chip = page.locator('.ProseMirror .timestamp');
  await expect(chip).toHaveCount(1);
  await expect(chip.first()).toHaveText('0:04');
  await expect(chip.first()).toHaveAttribute('data-time', '4');
});

test('clicking a timestamp chip seeks the player', async ({ page }) => {
  await createSessionFromSample(page);
  await typeIntoEditor(page, 'Point A ');

  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) => (el.currentTime = 6));
  await page.keyboard.press(`${mod}+;`);

  await media.evaluate((el: HTMLMediaElement) => (el.currentTime = 0));

  await page.locator('.ProseMirror .timestamp').first().click();
  await page.waitForTimeout(60);
  expect(await media.evaluate((el: HTMLMediaElement) => el.currentTime)).toBeCloseTo(6, 2);
});

test('undo removes an inserted timestamp; redo restores it', async ({ page }) => {
  await createSessionFromSample(page);
  await typeIntoEditor(page, 'A ');

  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) => (el.currentTime = 3));
  await page.keyboard.press(`${mod}+;`);

  await expect(page.locator('.ProseMirror .timestamp')).toHaveCount(1);

  await page.locator('.ProseMirror').first().focus();
  await page.keyboard.press(`${mod}+z`);
  await expect(page.locator('.ProseMirror .timestamp')).toHaveCount(0);

  await page.keyboard.press(`${mod}+Shift+z`);
  await expect(page.locator('.ProseMirror .timestamp')).toHaveCount(1);
});

test('document with timestamp survives reload', async ({ page }) => {
  await createSessionFromSample(page);
  await typeIntoEditor(page, 'Interview begins ');

  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) => (el.currentTime = 7.5));
  await page.keyboard.press(`${mod}+;`);
  await typeIntoEditor(page, ' now');
  await waitForSaved(page);

  await page.reload();
  await expect(page.locator('.ProseMirror').first()).toContainText('Interview begins');
  await expect(page.locator('.ProseMirror').first()).toContainText('now');
  const chip = page.locator('.ProseMirror .timestamp').first();
  await expect(chip).toHaveText('0:07');
  await expect(chip).toHaveAttribute('data-time', '7.5');
});

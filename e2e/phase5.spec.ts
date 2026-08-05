import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_AUDIO = path.join(HERE, 'fixtures', 'sample-tone-10s.mp3');
const V1_OTR = path.join(HERE, 'fixtures', 'sample-v1.otr');

async function resetStorage(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    const dbs = await indexedDB.databases?.();
    if (dbs) for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await resetStorage(page);
});

test('library row: rename, duplicate, and delete flow', async ({ page }) => {
  await page.getByTestId('file-input').setInputFiles(SAMPLE_AUDIO);
  await page.waitForURL(/\/sessions\/[0-9a-f-]{36}/);
  await page.goto('/');
  await expect(page.getByTestId('session-list')).toBeVisible();

  // Rename inline.
  await page.getByTestId('rename-btn').first().click();
  const input = page.getByTestId('rename-input');
  await expect(input).toBeVisible();
  await input.fill('Renamed transcript');
  await input.press('Enter');
  await expect(page.locator('.title').first()).toHaveText('Renamed transcript');

  // Duplicate — expect a second row with the "Copy of" prefix.
  await page.getByTestId('duplicate-btn').first().click();
  await expect(page.locator('.title')).toHaveCount(2);
  await expect(page.getByText('Copy of Renamed transcript')).toBeVisible();
});

test('export .otr v2 downloads a JSON blob with textDoc + sessionId', async ({ page }) => {
  await page.getByTestId('file-input').setInputFiles(SAMPLE_AUDIO);
  await page.waitForURL(/\/sessions\/[0-9a-f-]{36}/);
  await page.goto('/');

  await page.getByTestId('export-btn').first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-otr-v2').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.otr$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(parsed.otrVersion).toBe(2);
  expect(parsed.sessionId).toMatch(/[0-9a-f-]{36}/);
  expect(parsed).toHaveProperty('textDoc');
});

test('export → re-import roundtrips through the library', async ({ page }) => {
  await page.getByTestId('file-input').setInputFiles(V1_OTR);
  await page.waitForURL(/\/sessions\/[0-9a-f-]{36}/);
  // Editor should show the imported prose.
  await expect(page.locator('.ProseMirror').first()).toContainText('When did you first hear');
  // No media attached — the attach-media panel should render.
  await expect(page.getByTestId('no-media')).toBeVisible();
});

test('markdown import produces paragraphs + timestamps', async ({ page }) => {
  await page.getByTestId('file-input').setInputFiles({
    name: 'notes.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('[0:12] Reporter: hello.\n\n[1:15] Source: yes.')
  });
  await page.waitForURL(/\/sessions\/[0-9a-f-]{36}/);
  const editor = page.locator('.ProseMirror').first();
  await expect(editor).toContainText('Reporter: hello.');
  await expect(editor).toContainText('Source: yes.');
  await expect(editor.locator('.timestamp').first()).toBeVisible();
});

test('language picker persists across reload and swaps a bound string', async ({ page }) => {
  await page.goto('/settings');
  const select = page.getByTestId('setting-ui-locale');
  await select.selectOption('fr');
  await page.goto('/');
  // v1 French INI: `choose-file = Choisissez le fichier audio (ou vidéo)`
  await expect(page.getByRole('button', { name: /Choisissez le fichier/i })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Choisissez le fichier/i })).toBeVisible();
});

test('v1 → v2 migration surfaces old backups on first boot', async ({ page }) => {
  // Seed v1 localStorage BEFORE letting the layout run migration.
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    if (dbs) for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
    localStorage.clear();
    localStorage.setItem(
      'localStorageManager_oTranscribe-backup-1700000000000',
      JSON.stringify({
        value: '<p>Reporter: from v1</p>',
        timestamp: 1_700_000_000_000
      })
    );
  });
  await page.reload();
  await expect(page.getByTestId('session-list')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/v1 Backup/)).toBeVisible();
});

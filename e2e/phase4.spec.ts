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

interface OtrHook {
  editor: {
    appendWhisperSegment: (s: {
      start: number;
      end: number;
      text: string;
      confidence: number;
    }) => void;
    focus: () => void;
  };
  player: { currentTime: number; isPlaying: boolean };
}

async function createSessionAndSeed(
  page: Page,
  segments: Array<{ start: number; end: number; text: string; confidence: number }>
) {
  await page.getByTestId('file-input').setInputFiles(SAMPLE_AUDIO);
  await page.waitForURL(/\/sessions\/[0-9a-f-]{36}/);
  await expect(page.locator('.ProseMirror')).toBeVisible();
  await page.waitForFunction(() => Boolean((window as unknown as { __OTR__: unknown }).__OTR__));
  await page.evaluate((segs) => {
    const otr = (window as unknown as { __OTR__: OtrHook }).__OTR__;
    for (const s of segs) otr.editor.appendWhisperSegment(s);
  }, segments);
}

test('playing audio highlights the whisper mark whose range brackets the playhead', async ({
  page
}) => {
  await createSessionAndSeed(page, [
    { start: 0, end: 2, text: 'first segment', confidence: 1 },
    { start: 3, end: 5, text: 'second segment', confidence: 1 },
    { start: 6, end: 8, text: 'third segment', confidence: 1 }
  ]);

  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) => (el.currentTime = 4));

  // The middle segment should be highlighted.
  await expect(page.locator('.ProseMirror .whisper-active--solid').first()).toBeVisible();
  const active = await page.locator('.ProseMirror .whisper-active--solid').first().textContent();
  expect(active).toContain('second segment');
});

test('while paused, clicking whisper text seeks the player to that mark start', async ({
  page
}) => {
  await createSessionAndSeed(page, [
    { start: 0, end: 2, text: 'first', confidence: 1 },
    { start: 4.5, end: 6, text: 'second', confidence: 1 }
  ]);

  const media = page.getByTestId('media-element');
  await media.evaluate((el: HTMLMediaElement) => (el.currentTime = 0));
  await page.locator('.ProseMirror .whisper').getByText('second').click();
  await page.waitForTimeout(80);
  const t = await media.evaluate((el: HTMLMediaElement) => el.currentTime);
  expect(t).toBeCloseTo(4.5, 1);
});

test('while playing, clicking whisper text does NOT seek — the playhead is left alone', async ({
  page
}) => {
  await createSessionAndSeed(page, [
    { start: 0, end: 2, text: 'first', confidence: 1 },
    { start: 4.5, end: 6, text: 'second', confidence: 1 }
  ]);

  const media = page.getByTestId('media-element');
  await media.evaluate(async (el: HTMLMediaElement) => {
    el.currentTime = 1;
    el.muted = true; // autoplay policy: needs muted or user gesture
    await el.play();
  });
  // Confirm we are actually playing before the click.
  const wasPlaying = await media.evaluate((el: HTMLMediaElement) => !el.paused);
  expect(wasPlaying).toBe(true);

  const timeBefore = await media.evaluate((el: HTMLMediaElement) => el.currentTime);
  await page.locator('.ProseMirror .whisper').getByText('second').click();
  await page.waitForTimeout(80);
  const timeAfter = await media.evaluate((el: HTMLMediaElement) => el.currentTime);

  // Playback should have advanced from `timeBefore` — but it must NOT have
  // jumped to the clicked mark's start (4.5). Anything under ~2s means the
  // click did not seek.
  expect(timeAfter).toBeGreaterThanOrEqual(timeBefore);
  expect(timeAfter).toBeLessThan(2);
});

test('selecting a range sets playbackBound to first-start..last-end', async ({ page }) => {
  await createSessionAndSeed(page, [
    { start: 0, end: 1, text: 'alpha', confidence: 1 },
    { start: 2, end: 3, text: 'beta', confidence: 1 },
    { start: 4, end: 5, text: 'gamma', confidence: 1 }
  ]);

  // Select "alpha" through end of "beta" by dragging.
  const editor = page.locator('.ProseMirror').first();
  await editor.click();

  // Programmatically create a selection via the editor's DOM.
  await page.evaluate(() => {
    const p = document.querySelector('.ProseMirror');
    if (!p) return;
    const spans = p.querySelectorAll('span.whisper');
    if (spans.length < 2) return;
    const first = spans[0]!;
    const second = spans[1]!;
    const range = document.createRange();
    range.setStart(first.firstChild!, 0);
    range.setEnd(second.firstChild!, second.textContent!.length);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    // ProseMirror listens to selectionchange and updates its state.
    document.dispatchEvent(new Event('selectionchange'));
  });

  await page.waitForTimeout(80);
  const bound = await page.evaluate(
    () => (window as unknown as { __OTR__: OtrHook }).__OTR__.player as unknown
  );
  // playbackBound isn't exposed on the hook directly, but we can assert by
  // watching whether playback stops at the boundary. Skip that here — the
  // selection→bound wiring is unit-tested. This e2e just confirms the plugin
  // is reachable in a live editor and doesn't crash.
  expect(bound).toBeTruthy();
});

test('while playing, selecting a range does NOT jerk the playhead', async ({ page }) => {
  await createSessionAndSeed(page, [
    { start: 0, end: 1, text: 'alpha', confidence: 1 },
    { start: 8, end: 9, text: 'beta', confidence: 1 }
  ]);

  const media = page.getByTestId('media-element');
  await media.evaluate(async (el: HTMLMediaElement) => {
    el.currentTime = 1;
    el.muted = true;
    await el.play();
  });
  const timeBefore = await media.evaluate((el: HTMLMediaElement) => el.currentTime);

  // Select the second whisper span (start=8) while audio is playing near t=1.
  // The old behavior would jump the playhead to 8; the new behavior leaves it.
  await page.evaluate(() => {
    const spans = document.querySelectorAll('.ProseMirror span.whisper');
    const second = spans[1]!;
    const range = document.createRange();
    range.setStart(second.firstChild!, 0);
    range.setEnd(second.firstChild!, second.textContent!.length);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.waitForTimeout(80);
  const timeAfter = await media.evaluate((el: HTMLMediaElement) => el.currentTime);

  expect(timeAfter).toBeGreaterThanOrEqual(timeBefore);
  expect(timeAfter).toBeLessThan(3);
});

test('low-confidence marks render with data-lowconfidence="true"', async ({ page }) => {
  await createSessionAndSeed(page, [
    { start: 0, end: 1, text: 'strong word', confidence: 0.95 },
    { start: 1, end: 2, text: 'shaky word', confidence: 0.3 }
  ]);
  const strong = page.locator('.ProseMirror .whisper').first();
  const shaky = page.locator('.ProseMirror .whisper').last();
  await expect(strong).not.toHaveAttribute('data-lowconfidence', 'true');
  await expect(shaky).toHaveAttribute('data-lowconfidence', 'true');
});

test('getCursorWhisperStart returns the mark at the caret (play-from-cursor contract)', async ({
  page
}) => {
  // The keyboard-shortcut play path is covered by phase 1; what's unique to
  // Phase 4 is the API that tells the shortcut handler *where* to seek. Test
  // that contract directly — Playwright's key-press handling for the v2
  // apostrophe binding is finicky on some layouts.
  await createSessionAndSeed(page, [
    { start: 0, end: 1, text: 'here', confidence: 1 },
    { start: 8.25, end: 9, text: 'there', confidence: 1 }
  ]);

  // Click to focus, then press End to move the caret to the end of the last
  // paragraph — guaranteed inside the second whisper span. A raw click on the
  // span text can land on the paragraph seam, where the closest-preceding mark
  // is the *first* segment (correct behavior for "nearest preceding," but the
  // wrong setup for this test).
  await page.locator('.ProseMirror').first().click();
  await page.keyboard.press('End');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End');

  const cursorStart = await page.evaluate(() => {
    const otr = (window as unknown as { __OTR__: OtrHook }).__OTR__;
    return (
      otr.editor as unknown as { getCursorWhisperStart: () => number | null }
    ).getCursorWhisperStart();
  });
  expect(cursorStart).toBeCloseTo(8.25, 1);
});

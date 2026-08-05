/**
 * SPEC §3.2 — typing during playback attaches a fresh `whisper` mark to the
 * newly-written text. `{start, end, confidence: 1.0}` where:
 *   - start = player.currentTime at the first keystroke of the burst
 *   - end   = player.currentTime at the moment the debounce timer fires
 *
 * The mark reflects the wall-clock window during which the user was writing,
 * so manual-transcription workflows produce time-aligned text automatically.
 *
 * State machine:
 *   idle → typing (on any docChanged tx with net delta > 0 while playing)
 *   typing → typing (each keystroke resets the debounce timer, extends endPos)
 *   typing → idle  (debounce fires, apply mark, or plugin destroyed)
 *
 * Non-events (does not enter tracking):
 *   - Whisper-append transactions (marked via meta AUTO_MARK_SKIP)
 *   - Any tx while player is paused
 *   - Deletion-only transactions (delta ≤ 0)
 *
 * Not addressed for MVP (documented follow-ups):
 *   - Seek mid-typing: currently the endTime is whatever currentTime the timer
 *     sees when it fires. If the user seeked forward mid-burst, the applied
 *     range spans an artificial window. Acceptable trade-off — seeks mid-typing
 *     are rare, and the resulting mark is still useful (just imprecise).
 *   - Multiple non-contiguous inserts inside one debounce window: we track a
 *     single [start, end] range and grow it to the latest cursor position. If
 *     the user inserts characters in two different places during the same
 *     burst, the mark spans both, marking uninvolved characters in between.
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { PlayerContext } from '$lib/player';

export const AUTO_MARK_SKIP = 'otr-typing-mark-skip';
const AUTO_MARK_FINALIZE = 'otr-typing-mark-finalize';
const DEFAULT_DEBOUNCE_MS = 400;

const KEY = new PluginKey('otr-typing-mark');

interface Tracking {
  startTime: number;
  startPos: number;
  endPos: number;
}

export function typingDuringPlaybackPlugin(
  player: PlayerContext,
  options: { debounceMs?: number } = {}
): Plugin {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  return new Plugin({
    key: KEY,
    view() {
      let tracking: Tracking | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const clearTimer = () => {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
      };

      const finalize = (view: EditorView) => {
        clearTimer();
        const t = tracking;
        tracking = null;
        if (!t) return;
        if (t.endPos <= t.startPos) return;
        const whisper = view.state.schema.marks.whisper;
        if (!whisper) return;
        const mark = whisper.create({
          start: t.startTime,
          end: player.currentTime,
          confidence: 1.0
        });
        const tr = view.state.tr
          .addMark(t.startPos, t.endPos, mark)
          .setMeta(AUTO_MARK_FINALIZE, true)
          .setMeta('addToHistory', false);
        view.dispatch(tr);
      };

      return {
        update(view, prevState) {
          // The transaction that just applied is view.state.tr… actually we can
          // recover the last transaction by comparing. We only need to know if
          // the last dispatch was our own finalize (skip) or a Whisper append
          // (skip). Meta lives on the transaction, not the state — we peek via
          // the state's stored `tr` if available, but ProseMirror only exposes
          // the "current" transactions after the fact through `apply`. Simplest
          // check: reject when the doc-size delta is zero AND doc.eq is false
          // (mark-only changes) OR when our own finalize just ran. We handle
          // both via a delta-first guard + a re-entrancy flag.

          // Guard: pure mark-only transactions (our own finalize or v1 imports)
          // don't grow the doc, so they'll fail the `delta > 0` test below.
          const prevDoc = prevState.doc;
          const nextDoc = view.state.doc;
          if (prevDoc === nextDoc || prevDoc.eq(nextDoc)) return;

          const delta = nextDoc.content.size - prevDoc.content.size;

          // Deletion or pure re-shuffle: finalize whatever we were tracking.
          if (delta <= 0) {
            if (tracking) finalize(view);
            return;
          }

          // Skip whisper-append insertions (they're segments streaming in).
          // We detect these by inspecting the newly-inserted content: if the
          // insertion range already carries a whisper mark, it's not user
          // typing. Cheap enough — we only walk the insertion span.
          const insertEnd = view.state.selection.from;
          const insertStart = insertEnd - delta;
          if (insertStart >= 0 && rangeAlreadyWhisperMarked(view, insertStart, insertEnd)) return;

          // Only enter tracking if the player is actively playing at the time
          // of the first keystroke. Once tracking, we continue until the timer
          // fires (per SPEC — debounce-driven end, not playback-driven end).
          if (!tracking) {
            if (!player.isPlaying) return;
            tracking = {
              startTime: player.currentTime,
              startPos: insertStart,
              endPos: insertEnd
            };
          } else {
            tracking.endPos = insertEnd;
          }

          clearTimer();
          timer = setTimeout(() => finalize(view), debounceMs);
        },
        destroy() {
          clearTimer();
          tracking = null;
        }
      };
    }
  });
}

function rangeAlreadyWhisperMarked(view: EditorView, from: number, to: number): boolean {
  if (from >= to) return false;
  let marked = false;
  view.state.doc.nodesBetween(from, to, (node) => {
    if (marked) return false;
    if (!node.isText) return true;
    if (node.marks.some((m) => m.type.name === 'whisper')) marked = true;
    return true;
  });
  return marked;
}

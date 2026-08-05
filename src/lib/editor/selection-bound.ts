/**
 * SPEC §3.2 — selecting a range in the editor scopes playback to
 * `[firstWhisperMark.start, lastWhisperMark.end]`, and playback loops within
 * that scope. This module observes ProseMirror selection changes and forwards
 * them to the player, **but only while the player is paused**.
 *
 * Rationale: adjusting the selection during playback (to look at something,
 * to fix a typo, to highlight a quote) shouldn't jerk the audio around. The
 * bound is snapshot at the paused→play transition — `PlayerContext.play()`
 * seeks to bound.start whenever the playhead is outside the bound.
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import type { Node as PMNode } from 'prosemirror-model';
import type { PlayerContext } from '$lib/player';

const KEY = new PluginKey('otr-selection-bound');

/**
 * Compute the smallest [firstStart, lastEnd] covering every whisper mark that
 * appears in `[from, to)`. Returns null if the selection touches no marks.
 */
export function whisperRangeInSelection(
  doc: PMNode,
  from: number,
  to: number
): [number, number] | null {
  if (from >= to) return null;
  let earliest = Infinity;
  let latest = -Infinity;
  doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return true;
    for (const mark of node.marks) {
      if (mark.type.name !== 'whisper') continue;
      const start = Number(mark.attrs.start);
      const end = Number(mark.attrs.end);
      if (Number.isFinite(start) && start < earliest) earliest = start;
      if (Number.isFinite(end) && end > latest) latest = end;
    }
    return true;
  });
  if (earliest === Infinity || latest === -Infinity) return null;
  return [earliest, latest];
}

export function selectionBoundPlugin(player: PlayerContext): Plugin {
  return new Plugin({
    key: KEY,
    view() {
      return {
        update(view, prevState) {
          // Ignore selection changes while the player is playing. The bound
          // snapshotted at play time stays engaged until the user pauses.
          if (player.isPlaying) return;

          const { selection } = view.state;
          const prev = prevState.selection;
          if (
            prev.from === selection.from &&
            prev.to === selection.to &&
            prevState.doc === view.state.doc
          ) {
            return;
          }
          if (selection.empty) {
            player.clearBound();
            return;
          }
          const bound = whisperRangeInSelection(view.state.doc, selection.from, selection.to);
          if (bound) {
            player.setBound(bound);
          } else {
            player.clearBound();
          }
        },
        destroy() {
          player.clearBound();
        }
      };
    }
  });
}

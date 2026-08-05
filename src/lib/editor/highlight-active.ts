/**
 * Playback → editor highlight (SPEC §3.2).
 *
 * Renders a solid highlight over every `whisper` mark whose {start, end}
 * brackets the current playhead. Follow-up: gradient fill for partial matches
 * (marks whose only start OR end matches near t) — the SPEC calls for it but
 * the exact semantics are underspecified; leaving a code seam for later.
 *
 * Performance: the plugin only rebuilds its DecorationSet when the *set of
 * bracketing marks* changes, not on every timeupdate tick. For a 30k-word
 * document with typical ~1s segments, the active set changes at most a few
 * times per second — full-doc scan on those transitions is cheap.
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { PlayerContext } from '$lib/player';

const KEY = new PluginKey<HighlightState>('otr-highlight-active');
const SET_TIME = 'otr-highlight-set-time';

interface HighlightState {
  /** Current playhead in seconds, in the plugin's view. */
  time: number;
  /** DecorationSet reflecting `time`. */
  decorations: DecorationSet;
  /** Signature of the active-mark set at `time` — used to skip needless rebuilds. */
  signature: string;
}

interface ActiveMark {
  from: number;
  to: number;
  start: number;
  end: number;
}

/**
 * Walk the doc for whisper marks bracketing `t`. Returns the covered ranges
 * plus a signature string for cheap diffing across ticks.
 */
export function findActiveMarks(
  doc: import('prosemirror-model').Node,
  t: number,
  markTypeName = 'whisper'
): { marks: ActiveMark[]; signature: string } {
  const marks: ActiveMark[] = [];
  const parts: string[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    for (const mark of node.marks) {
      if (mark.type.name !== markTypeName) continue;
      const start = Number(mark.attrs.start);
      const end = Number(mark.attrs.end);
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (t < start || t > end) continue;
      const from = pos;
      const to = pos + (node.nodeSize as number);
      marks.push({ from, to, start, end });
      parts.push(`${from}-${to}`);
    }
    return true;
  });
  return { marks, signature: parts.join('|') };
}

/**
 * ProseMirror plugin that maintains the highlight decorations.
 * Drive it from the Svelte side by dispatching `setActiveTime(view, t)` on
 * every player.currentTime change.
 */
export function playbackHighlightPlugin(player: PlayerContext): Plugin<HighlightState> {
  return new Plugin<HighlightState>({
    key: KEY,
    state: {
      init(_config, state): HighlightState {
        const { marks, signature } = findActiveMarks(state.doc, player.currentTime);
        return {
          time: player.currentTime,
          decorations: DecorationSet.create(
            state.doc,
            marks.map((m) =>
              Decoration.inline(m.from, m.to, { class: 'whisper-active whisper-active--solid' })
            )
          ),
          signature
        };
      },
      apply(tr, prev, _oldState, newState): HighlightState {
        const setTime = tr.getMeta(SET_TIME) as number | undefined;
        // If the doc changed but time didn't, remap and recompute against the new doc.
        const timeChanged = typeof setTime === 'number' && setTime !== prev.time;
        const docChanged = tr.docChanged;
        if (!timeChanged && !docChanged) return prev;

        const time = typeof setTime === 'number' ? setTime : prev.time;
        const { marks, signature } = findActiveMarks(newState.doc, time);
        if (!timeChanged && signature === prev.signature) {
          // Doc changed but active set didn't — remap positions.
          return { ...prev, time, decorations: prev.decorations.map(tr.mapping, newState.doc) };
        }
        return {
          time,
          signature,
          decorations: DecorationSet.create(
            newState.doc,
            marks.map((m) =>
              Decoration.inline(m.from, m.to, { class: 'whisper-active whisper-active--solid' })
            )
          )
        };
      }
    },
    props: {
      decorations(state) {
        return KEY.getState(state)?.decorations;
      }
    }
  });
}

/**
 * Dispatch a transaction that updates the highlight plugin's known playhead.
 * Cheap on repeated calls with the same value — apply() short-circuits.
 */
export function setActiveTime(view: import('prosemirror-view').EditorView, t: number): void {
  const state = view.state;
  const plugin = KEY.get(state);
  if (!plugin) return;
  const prev = KEY.getState(state);
  if (prev && prev.time === t) return;
  view.dispatch(state.tr.setMeta(SET_TIME, t));
}

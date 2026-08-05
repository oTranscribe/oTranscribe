/**
 * SPEC §3.2 — during playback, keep the currently-active whisper mark in view.
 *
 * Pagination model: scroll fires *only* when the active mark leaves the
 * viewport. While it stays visible we do nothing — calm at rest, decisive on
 * demand. When it does leave, we land it a third from the near edge so there's
 * a screen's worth of runway in the direction of motion:
 *   - Mark exited off the top    → land at bottom-1/3 (runway above).
 *   - Mark exited off the bottom → land at top-1/3    (runway below).
 *
 * The scroll itself goes through an `InterruptingScroller` (rAF-driven smooth
 * scroll). Repeated calls during a scrub cancel the in-flight animation and
 * restart toward the new target — so we're always animating toward exactly
 * one destination.
 *
 * Enabled via `autoScrollDuringPlayback` setting; default on.
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { findActiveMarks } from './highlight-active';
import { InterruptingScroller } from './smooth-scroll';

const KEY = new PluginKey('otr-auto-scroll');
const SET_TIME = 'otr-auto-scroll-set-time';
const SET_ENABLED = 'otr-auto-scroll-set-enabled';

interface State {
  enabled: boolean;
  time: number;
}

export function autoScrollPlugin(initialEnabled = true): Plugin<State> {
  return new Plugin<State>({
    key: KEY,
    state: {
      init(): State {
        return { enabled: initialEnabled, time: 0 };
      },
      apply(tr, prev): State {
        const nextTime = tr.getMeta(SET_TIME);
        const nextEnabled = tr.getMeta(SET_ENABLED);
        return {
          enabled: typeof nextEnabled === 'boolean' ? nextEnabled : prev.enabled,
          time: typeof nextTime === 'number' ? nextTime : prev.time
        };
      }
    },
    view() {
      let lastSignature = '';
      let container: HTMLElement | null = null;
      let scroller: InterruptingScroller | null = null;

      return {
        update(view) {
          const state = KEY.getState(view.state);
          if (!state?.enabled) {
            scroller?.cancel();
            return;
          }
          const { marks, signature } = findActiveMarks(view.state.doc, state.time);
          if (signature === lastSignature) return;
          lastSignature = signature;
          if (marks.length === 0) return;

          if (!container) {
            container = findScrollableAncestor(view.dom);
            if (container) scroller = new InterruptingScroller(container);
          }
          if (!container || !scroller) return;

          scrollMarkIfOutOfView(view, marks[0]!.from, container, scroller);
        },
        destroy() {
          scroller?.cancel();
          scroller = null;
          container = null;
        }
      };
    }
  });
}

export function setAutoScrollTime(view: EditorView, t: number): void {
  const prev = KEY.getState(view.state);
  if (!prev || prev.time === t) return;
  view.dispatch(view.state.tr.setMeta(SET_TIME, t));
}

export function setAutoScrollEnabled(view: EditorView, enabled: boolean): void {
  const prev = KEY.getState(view.state);
  if (!prev || prev.enabled === enabled) return;
  view.dispatch(view.state.tr.setMeta(SET_ENABLED, enabled));
}

function scrollMarkIfOutOfView(
  view: EditorView,
  pos: number,
  container: HTMLElement,
  scroller: InterruptingScroller
): void {
  try {
    const coords = view.coordsAtPos(pos);
    const rect = container.getBoundingClientRect();
    const markTop = coords.top - rect.top;
    const markBottom = coords.bottom - rect.top;
    const outAbove = markBottom < 0;
    const outBelow = markTop > rect.height;
    if (!outAbove && !outBelow) return;

    // Mark exited off the top → user is moving backward, land at bottom-1/3.
    // Mark exited off the bottom → forward motion, land at top-1/3.
    const targetY = outAbove ? rect.height * (2 / 3) : rect.height / 3;
    scroller.scrollTo(container.scrollTop + (markTop - targetY));
  } catch {
    // coordsAtPos throws during transient states — silently skip this tick.
  }
}

function findScrollableAncestor(el: Element | null): HTMLElement | null {
  let cur = el?.parentElement ?? null;
  while (cur) {
    const style = window.getComputedStyle(cur);
    if (/(auto|scroll)/.test(style.overflowY)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

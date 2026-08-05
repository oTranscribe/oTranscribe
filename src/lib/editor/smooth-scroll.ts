/**
 * requestAnimationFrame-driven smooth scroller with clean interruption.
 *
 * Why not `scrollTo({ behavior: 'smooth' })`? The CSS spec says a new smooth
 * scroll should abort any in-flight one, but browser implementations diverge
 * (Safari has historically been rough). Owning our own animation loop gives
 * us consistent cross-browser behavior and lets us tune duration/easing.
 *
 * Why not the Web Animations API? WAAPI can't animate `scrollTop` directly on
 * a regular scroll container — only ScrollTimeline / view transitions touch
 * scroll, and neither fits the "drive scroll from a callback" shape we need.
 *
 * Behavior on a new target:
 *  - If we're already at the target (or very close), no-op.
 *  - If an animation is in flight and the target hasn't moved, no-op.
 *  - Otherwise cancel the in-flight animation and start a fresh one from the
 *    *current* scrollTop toward the new target — no visible jump on interrupt.
 *
 * Respects `prefers-reduced-motion` — scrolls are instant when set.
 */

const DEFAULT_DURATION_MS = 220;

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

export class InterruptingScroller {
  private rafId: number | null = null;
  private startTop = 0;
  private targetTop = 0;
  private startTime = 0;
  private readonly reducedMotion: boolean;

  constructor(
    private readonly el: HTMLElement,
    private readonly durationMs = DEFAULT_DURATION_MS
  ) {
    this.reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  scrollTo(top: number): void {
    if (this.reducedMotion) {
      this.cancel();
      this.el.scrollTop = top;
      return;
    }
    // No-op restarts: already headed there, or already parked there.
    if (this.rafId !== null && Math.abs(this.targetTop - top) < 1) return;
    if (this.rafId === null && Math.abs(this.el.scrollTop - top) < 1) return;

    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.startTop = this.el.scrollTop;
    this.targetTop = top;
    this.startTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (now: number) => {
    const t = Math.min(1, (now - this.startTime) / this.durationMs);
    const eased = easeOutCubic(t);
    this.el.scrollTop = this.startTop + (this.targetTop - this.startTop) * eased;
    if (t < 1) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.rafId = null;
    }
  };
}

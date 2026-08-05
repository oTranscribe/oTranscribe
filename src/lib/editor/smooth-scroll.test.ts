import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InterruptingScroller } from './smooth-scroll';

class FakeScrollEl {
  scrollTop = 0;
}

/**
 * Manually pump rAF via mocked timers so tests are deterministic. Each `tick`
 * advances performance.now() by 16ms and fires the next queued frame.
 */
class RafHarness {
  now = 0;
  private queue: Array<(t: number) => void> = [];
  install() {
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      this.queue.push(cb);
      return this.queue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      // ids are 1-based indices; cancel by clearing the slot.
      if (this.queue[id - 1]) this.queue[id - 1] = () => {};
    });
    vi.stubGlobal('performance', { now: () => this.now });
  }
  restore() {
    vi.unstubAllGlobals();
  }
  tick(ms = 16) {
    this.now += ms;
    const frame = this.queue.shift();
    frame?.(this.now);
  }
  drain(maxTicks = 200) {
    for (let i = 0; i < maxTicks && this.queue.length > 0; i += 1) this.tick();
  }
}

describe('InterruptingScroller', () => {
  let harness: RafHarness;

  beforeEach(() => {
    harness = new RafHarness();
    harness.install();
    // Ensure matchMedia doesn't report reduced-motion in tests.
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  afterEach(() => {
    harness.restore();
  });

  it('animates from current scrollTop to the target', () => {
    const el = new FakeScrollEl() as unknown as HTMLElement;
    const s = new InterruptingScroller(el, 100);
    s.scrollTo(200);
    harness.drain();
    expect(el.scrollTop).toBe(200);
  });

  it('does nothing when target equals current scrollTop', () => {
    const el = new FakeScrollEl() as unknown as HTMLElement;
    el.scrollTop = 150;
    const s = new InterruptingScroller(el, 100);
    s.scrollTo(150);
    // No animation started — a drain shouldn't move anything.
    harness.drain();
    expect(el.scrollTop).toBe(150);
  });

  it('interrupts a mid-flight animation: cancels the old and restarts from current position', () => {
    const el = new FakeScrollEl() as unknown as HTMLElement;
    const s = new InterruptingScroller(el, 100);
    s.scrollTo(1000);
    harness.tick(); // one frame at ~16ms
    const partway = el.scrollTop;
    expect(partway).toBeGreaterThan(0);
    expect(partway).toBeLessThan(1000);

    // Interrupt with a new target. The old animation is discarded; we should
    // now be heading toward 500 from `partway`, not from 0.
    s.scrollTo(500);
    harness.drain();
    expect(el.scrollTop).toBe(500);
  });

  it('ignores restarts toward the same target', () => {
    const el = new FakeScrollEl() as unknown as HTMLElement;
    const s = new InterruptingScroller(el, 100);
    s.scrollTo(500);
    harness.tick();
    const partway = el.scrollTop;
    s.scrollTo(500); // same target — no restart, no jump
    harness.tick();
    expect(el.scrollTop).toBeGreaterThan(partway);
  });

  it('cancel() stops the animation in place', () => {
    const el = new FakeScrollEl() as unknown as HTMLElement;
    const s = new InterruptingScroller(el, 100);
    s.scrollTo(1000);
    harness.tick();
    const partway = el.scrollTop;
    s.cancel();
    harness.drain();
    expect(el.scrollTop).toBe(partway);
  });

  it('honors prefers-reduced-motion by jumping instantly', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const el = new FakeScrollEl() as unknown as HTMLElement;
    const s = new InterruptingScroller(el, 100);
    s.scrollTo(400);
    // No rAF should have been queued — the jump is synchronous.
    expect(el.scrollTop).toBe(400);
  });
});

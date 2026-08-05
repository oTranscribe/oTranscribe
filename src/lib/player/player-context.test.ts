import { describe, expect, it } from 'vitest';
import { PlayerContext } from './player-context.svelte';

/**
 * Minimal HTMLMediaElement stand-in — just enough surface for PlayerContext
 * to attach listeners, mutate currentTime, and observe play/pause state.
 */
class FakeMedia {
  currentTime = 0;
  duration = 60;
  paused = true;
  playbackRate = 1;
  private listeners = new Map<string, Set<() => void>>();

  addEventListener(name: string, fn: () => void): void {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(fn);
  }
  removeEventListener(name: string, fn: () => void): void {
    this.listeners.get(name)?.delete(fn);
  }
  fire(name: string): void {
    this.listeners.get(name)?.forEach((fn) => fn());
  }
  play(): Promise<void> {
    this.paused = false;
    this.fire('play');
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
    this.fire('pause');
  }
}

describe('PlayerContext.playbackBound looping', () => {
  it('loops back to bound start when playhead crosses bound end during playback', () => {
    const media = new FakeMedia();
    const player = new PlayerContext();
    player.attach(media as unknown as HTMLMediaElement);
    media.fire('loadedmetadata');

    player.setBound([10, 20]);
    void player.play();
    media.currentTime = 15;
    media.fire('timeupdate');
    expect(media.paused).toBe(false);
    expect(media.currentTime).toBe(15);

    // Cross the bound — the next timeupdate should wrap us to the start.
    media.currentTime = 20.1;
    media.fire('timeupdate');
    expect(media.paused).toBe(false);
    expect(media.currentTime).toBe(10);
  });

  it('does not wrap while paused — user pausing near the bound end stays put', () => {
    const media = new FakeMedia();
    const player = new PlayerContext();
    player.attach(media as unknown as HTMLMediaElement);
    media.fire('loadedmetadata');

    player.setBound([10, 20]);
    // Simulate media landing past the end but paused (e.g., user hit pause).
    media.currentTime = 20.5;
    media.paused = true;
    media.fire('timeupdate');
    expect(media.currentTime).toBe(20.5);
  });

  it('leaves playback alone when there is no bound', () => {
    const media = new FakeMedia();
    const player = new PlayerContext();
    player.attach(media as unknown as HTMLMediaElement);
    media.fire('loadedmetadata');

    void player.play();
    media.currentTime = 45;
    media.fire('timeupdate');
    expect(media.currentTime).toBe(45);
    expect(media.paused).toBe(false);
  });

  it('clearBound releases the loop so playback continues linearly past the old end', () => {
    const media = new FakeMedia();
    const player = new PlayerContext();
    player.attach(media as unknown as HTMLMediaElement);
    media.fire('loadedmetadata');

    player.setBound([10, 20]);
    void player.play();
    player.clearBound();

    media.currentTime = 25;
    media.fire('timeupdate');
    expect(media.currentTime).toBe(25);
  });
});

describe('PlayerContext.setBound vs play focus', () => {
  it('setBound does NOT seek — the playhead stays where the user parked it', () => {
    const media = new FakeMedia();
    const player = new PlayerContext();
    player.attach(media as unknown as HTMLMediaElement);
    media.fire('loadedmetadata');
    media.currentTime = 3;

    player.setBound([10, 20]);
    expect(media.currentTime).toBe(3);
  });

  it('play() focuses the bound: seeks to bound.start when playhead is outside', () => {
    const media = new FakeMedia();
    const player = new PlayerContext();
    player.attach(media as unknown as HTMLMediaElement);
    media.fire('loadedmetadata');

    // Playhead outside bound (before).
    media.currentTime = 3;
    player.setBound([10, 20]);
    void player.play();
    expect(media.currentTime).toBe(10);

    // And outside bound (after) — same seek to start.
    media.paused = true;
    media.currentTime = 30;
    void player.play();
    expect(media.currentTime).toBe(10);
  });

  it('play() resumes from inside the bound without seeking — the mid-loop pause case', () => {
    const media = new FakeMedia();
    const player = new PlayerContext();
    player.attach(media as unknown as HTMLMediaElement);
    media.fire('loadedmetadata');

    player.setBound([10, 20]);
    media.currentTime = 14;
    void player.play();
    expect(media.currentTime).toBe(14);
  });
});

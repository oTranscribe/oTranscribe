export const SKIP_SECONDS = 1.5;
export const SPEED_MIN = 0.5;
export const SPEED_MAX = 2.5;
export const SPEED_STEP = 0.125;

export type PlaybackBound = readonly [start: number, end: number] | null;

const clampSpeed = (s: number) => Math.min(SPEED_MAX, Math.max(SPEED_MIN, s));

export class PlayerContext {
  currentTime = $state(0);
  isPlaying = $state(false);
  speed = $state(1);
  duration = $state(0);
  playbackBound = $state<PlaybackBound>(null);

  private el: HTMLMediaElement | null = null;
  private cleanup: (() => void) | null = null;

  attach(el: HTMLMediaElement): void {
    if (this.el === el) return;
    this.detach();
    this.el = el;
    el.playbackRate = this.speed;

    const onTime = () => {
      this.currentTime = el.currentTime;
      // A selection in the editor sets `playbackBound`. Journalists reviewing a
      // phrase almost always want to hear it more than once, so the bound
      // loops rather than pausing at end. Play/pause stays a stable toggle;
      // clearing the selection releases the bound.
      if (!el.paused && this.playbackBound && el.currentTime >= this.playbackBound[1]) {
        el.currentTime = this.playbackBound[0];
      }
    };
    const onPlay = () => (this.isPlaying = true);
    const onPause = () => (this.isPlaying = false);
    const onLoaded = () => (this.duration = el.duration || 0);
    const onRate = () => (this.speed = el.playbackRate);

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('seeked', onTime);
    el.addEventListener('seeking', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('durationchange', onLoaded);
    el.addEventListener('ratechange', onRate);

    this.cleanup = () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('seeked', onTime);
      el.removeEventListener('seeking', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('durationchange', onLoaded);
      el.removeEventListener('ratechange', onRate);
    };

    if (!Number.isNaN(el.duration)) this.duration = el.duration;
  }

  detach(): void {
    this.cleanup?.();
    this.cleanup = null;
    this.el = null;
  }

  /** Force a re-read of el.currentTime — programmatic seeks don't always fire timeupdate. */
  readCurrentTime(): number {
    if (this.el) this.currentTime = this.el.currentTime;
    return this.currentTime;
  }

  play(): void {
    if (!this.el) return;
    // If a bound is set and the playhead is outside it, focus on the bound
    // when playback begins. This is the "paused→play focuses the selection"
    // behavior — because setBound no longer auto-seeks, the pre-play focus
    // happens here at the moment the user actually asks to hear the audio.
    // Playhead already inside the bound (e.g., resuming from pause mid-loop)
    // is left alone.
    if (this.playbackBound) {
      const [start, end] = this.playbackBound;
      if (this.el.currentTime < start || this.el.currentTime >= end) {
        this.el.currentTime = start;
      }
    }
    void this.el.play();
  }

  pause(): void {
    this.el?.pause();
  }

  toggle(): void {
    if (!this.el) return;
    if (this.el.paused) this.play();
    else this.pause();
  }

  seek(time: number): void {
    if (!this.el) return;
    const clamped = Math.max(0, Math.min(this.duration || Infinity, time));
    this.el.currentTime = clamped;
    this.currentTime = clamped;
  }

  skipBy(delta: number): void {
    if (!this.el) return;
    this.seek(this.el.currentTime + delta);
  }

  skipBack(): void {
    this.skipBy(-SKIP_SECONDS);
  }

  skipForward(): void {
    this.skipBy(SKIP_SECONDS);
  }

  setSpeed(next: number): void {
    const clamped = clampSpeed(Math.round(next / SPEED_STEP) * SPEED_STEP);
    this.speed = Number(clamped.toFixed(3));
    if (this.el) this.el.playbackRate = this.speed;
  }

  speedUp(): void {
    this.setSpeed(this.speed + SPEED_STEP);
  }

  speedDown(): void {
    this.setSpeed(this.speed - SPEED_STEP);
  }

  setBound(bound: PlaybackBound): void {
    // Pure state update — no seek. The playhead stays put; whenever playback
    // next begins, `play()` handles focusing on the bound. Keeps selection
    // changes silent while the user is still browsing/editing.
    this.playbackBound = bound;
  }

  clearBound(): void {
    this.playbackBound = null;
  }
}

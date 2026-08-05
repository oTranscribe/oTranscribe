<script lang="ts">
  import type { PlayerContext } from './player-context.svelte';
  import { SPEED_MAX, SPEED_MIN, SPEED_STEP } from './player-context.svelte';
  import { formatTime } from './format-time';

  interface Props {
    player: PlayerContext;
  }

  let { player }: Props = $props();

  let progressEl = $state<HTMLDivElement | null>(null);
  // Remember whether playback was running when the scrub started, so we can
  // restore it on release. Also silence looping-inside-selection while the
  // user drags around — the loop-back would fight the drag.
  let scrubbing = false;
  let wasPlayingBeforeScrub = false;

  function seekFromPointer(event: PointerEvent) {
    if (!progressEl || !player.duration) return;
    const rect = progressEl.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    player.seek(ratio * player.duration);
  }

  function onProgressPointerDown(event: PointerEvent) {
    if (event.button !== 0 || !progressEl) return;
    scrubbing = true;
    wasPlayingBeforeScrub = player.isPlaying;
    // Pause while dragging so we're not chasing a moving target. Restore on release.
    if (wasPlayingBeforeScrub) player.pause();
    progressEl.setPointerCapture(event.pointerId);
    seekFromPointer(event);
    event.preventDefault();
  }

  function onProgressPointerMove(event: PointerEvent) {
    if (!scrubbing) return;
    seekFromPointer(event);
  }

  function onProgressPointerUp(event: PointerEvent) {
    if (!scrubbing) return;
    scrubbing = false;
    progressEl?.releasePointerCapture(event.pointerId);
    if (wasPlayingBeforeScrub) player.play();
    wasPlayingBeforeScrub = false;
  }

  function onProgressKey(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      player.skipBack();
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      player.skipForward();
      event.preventDefault();
    }
  }
</script>

<div class="controls" role="group" aria-label="Media playback controls">
  <div class="progress-bar">
    <div
      bind:this={progressEl}
      class="progress"
      role="slider"
      tabindex="0"
      aria-label="Playback position"
      aria-valuemin={0}
      aria-valuemax={Math.round(player.duration)}
      aria-valuenow={Math.round(player.currentTime)}
      aria-valuetext={formatTime(player.currentTime)}
      onpointerdown={onProgressPointerDown}
      onpointermove={onProgressPointerMove}
      onpointerup={onProgressPointerUp}
      onpointercancel={onProgressPointerUp}
      onkeydown={onProgressKey}
    >
      <div
        class="progress-fill"
        style:width="{player.duration ? (player.currentTime / player.duration) * 100 : 0}%"
      ></div>
    </div>

    <span class="time" data-testid="time-display" aria-live="off">
      {formatTime(player.currentTime)} / {formatTime(player.duration)}
    </span>
  </div>
  <div class="playback">
    <button
      type="button"
      class="btn"
      onclick={() => player.toggle()}
      aria-label={player.isPlaying ? 'Pause' : 'Play'}
      data-testid="btn-play-pause"
    >
      {player.isPlaying ? 'Pause' : 'Play'}
    </button>
    <button
      type="button"
      class="btn"
      onclick={() => player.skipBack()}
      aria-label="Skip back 1.5 seconds"
      data-testid="btn-skip-back"
    >
      -1.5s
    </button>
    <button
      type="button"
      class="btn"
      onclick={() => player.skipForward()}
      aria-label="Skip forward 1.5 seconds"
      data-testid="btn-skip-forward"
    >
      +1.5s
    </button>
  </div>

  <label class="speed">
    <span class="visually-hidden">Playback speed</span>
    <button
      type="button"
      class="btn btn-tight"
      onclick={() => player.speedDown()}
      aria-label="Decrease playback speed"
      disabled={player.speed <= SPEED_MIN + 1e-6}
    >
      −
    </button>
    <span class="speed-value" data-testid="speed-value">{player.speed.toFixed(3)}×</span>
    <button
      type="button"
      class="btn btn-tight"
      onclick={() => player.speedUp()}
      aria-label="Increase playback speed"
      disabled={player.speed >= SPEED_MAX - 1e-6}
    >
      +
    </button>
  </label>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-dark);
    color: white;
    box-shadow: var(--shadow-topbar);
  }

  .progress-bar {
    flex: 1 1 100%;
    display: flex;
    align-items: center;
  }

  .playback, .speed {
    flex: 0 1 auto;
  }

  .btn {
    background: var(--color-dark);
    color: white;
    border: 1px solid var(--color-dark-hover);
    padding: 0.35rem 0.7rem;
    border-radius: var(--radius-chip);
    font: inherit;
    cursor: pointer;
  }
  .btn:hover:not(:disabled) {
    background: var(--color-dark-hover);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-tight {
    padding: 0.15rem 0.5rem;
    min-width: 1.6rem;
  }

  .progress {
    flex: 1;
    height: 0.6rem;
    background: var(--color-dark-hover);
    border-radius: 999px;
    cursor: pointer;
    position: relative;
    min-width: 4rem;
  }
  .progress:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
  .progress-fill {
    height: 100%;
    background: var(--color-accent);
    border-radius: inherit;
  }

  .time {
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
    min-width: 6rem;
    text-align: center;
  }

  .speed {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .speed-value {
    min-width: 3.5rem;
    text-align: center;
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
  }
  .speed input[type='range'] {
    width: 6rem;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>

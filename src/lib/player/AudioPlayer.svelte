<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { PlayerContext } from './player-context.svelte';
  import PlayerControls from './PlayerControls.svelte';

  interface Props {
    src: string;
    player: PlayerContext;
    initialTime?: number;
    mediaTitle?: string;
  }

  let { src, player, initialTime = 0, mediaTitle }: Props = $props();

  let audio = $state<HTMLAudioElement | null>(null);

  $effect(() => {
    if (!audio) return;
    player.attach(audio);
    if (initialTime > 0) {
      const seekWhenReady = () => player.seek(initialTime);
      if (audio.readyState >= 1) seekWhenReady();
      else audio.addEventListener('loadedmetadata', seekWhenReady, { once: true });
    }
  });

  onDestroy(() => player.detach());
</script>

<div class="audio-player" data-testid="audio-player">
  {#if mediaTitle}
    <div class="title">{mediaTitle}</div>
  {/if}
  <audio bind:this={audio} {src} preload="metadata" data-testid="media-element"></audio>
  <PlayerControls {player} />
</div>

<style>
  .audio-player {
    display: flex;
    flex-direction: column;
  }
  .title {
    padding: 0.25rem 0.75rem;
    background: var(--color-dark);
    color: lightgrey;
    font-size: 0.8rem;
    text-align: center;
    border-bottom: 1px solid var(--color-dark-hover);
  }
</style>

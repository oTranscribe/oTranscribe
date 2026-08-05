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

  let video = $state<HTMLVideoElement | null>(null);

  $effect(() => {
    if (!video) return;
    player.attach(video);
    if (initialTime > 0) {
      const seekWhenReady = () => player.seek(initialTime);
      if (video.readyState >= 1) seekWhenReady();
      else video.addEventListener('loadedmetadata', seekWhenReady, { once: true });
    }
  });

  onDestroy(() => player.detach());
</script>

<div class="video-player" data-testid="video-player">
  {#if mediaTitle}
    <div class="title">{mediaTitle}</div>
  {/if}
  <div class="video-frame">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} {src} preload="metadata" data-testid="media-element"></video>
  </div>
  <PlayerControls {player} />
</div>

<style>
  .video-player {
    display: flex;
    flex-direction: column;
    background: var(--color-dark);
    resize: both;
    overflow: auto;
    min-width: 320px;
    min-height: 240px;
    max-width: 100%;
  }
  .title {
    padding: 0.25rem 0.75rem;
    color: lightgrey;
    font-size: 0.8rem;
    text-align: center;
    border-bottom: 1px solid var(--color-dark-hover);
  }
  .video-frame {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: black;
  }
  video {
    width: 100%;
    height: auto;
    display: block;
  }
</style>

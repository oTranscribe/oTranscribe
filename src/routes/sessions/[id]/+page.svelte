<script lang="ts">
  import { onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { AudioPlayer, PlayerContext, VideoPlayer } from '$lib/player';
  import { findAction, getKeymap, type KeymapMode } from '$lib/keymap';
  import {
    DEFAULT_AUTO_SCROLL,
    DEFAULT_KEYMAP_MODE,
    getAutoScroll,
    getKeymapMode,
    getLowConfidenceThreshold,
    setKeymapMode
  } from '$lib/settings';
  import { setLowConfidenceThreshold as setSchemaLowConfidenceThreshold } from '$lib/editor/schema';
  import { sessionStore } from '$lib/storage';
  import type { Session } from '$lib/storage';
  import { Editor, type EditorApi, emptyDoc } from '$lib/editor';
  import { TranscribePanel } from '$lib/transcribe';

  let session = $state<Session | null>(null);
  let mediaUrl = $state<string | null>(null);
  let mediaBlob = $state<Blob | null>(null);
  let initialDoc = $state<unknown>(null);
  let keymapMode = $state<KeymapMode>(DEFAULT_KEYMAP_MODE);
  let autoScroll = $state(DEFAULT_AUTO_SCROLL);
  let notFound = $state(false);
  const player = new PlayerContext();
  let editorApi = $state<EditorApi | null>(null);

  let pendingDoc: unknown = null;
  let pendingText = '';
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSavedTime = 0;
  let currentSessionId: string | null = null;
  let saveState = $state<'idle' | 'pending' | 'saved' | 'error'>('idle');

  $effect(() => {
    const id = $page.params.id;
    if (!id) return;
    if (id === currentSessionId) return;
    currentSessionId = id;
    void loadSession(id);
  });

  async function loadSession(id: string) {
    const store = sessionStore();
    const record = await store.get(id);
    if (!record) {
      notFound = true;
      return;
    }
    const blob = await store.getMedia(id);
    mediaBlob = blob ?? null;
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    mediaUrl = blob ? URL.createObjectURL(blob) : null;

    initialDoc = record.textDoc ?? emptyDoc();
    pendingDoc = initialDoc;
    pendingText = record.text;
    session = record;
    keymapMode = await getKeymapMode();
    autoScroll = await getAutoScroll();
    // Push the persisted low-confidence threshold into the schema so any mark's
    // toDOM re-render picks up the user's setting instead of the default.
    setSchemaLowConfidenceThreshold(await getLowConfidenceThreshold());
    lastSavedTime = record.playbackTime;
    player.currentTime = record.playbackTime;
    player.isPlaying = false;
  }

  function scheduleSave() {
    saveState = 'pending';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(commitSave, 500);
  }

  async function commitSave() {
    if (!session) return;
    saveTimer = null;
    // $state.snapshot unwraps Svelte 5's reactive Proxy so structuredClone (used by IDB) succeeds.
    const patch = {
      text: pendingText,
      textDoc: $state.snapshot(pendingDoc),
      playbackTime: player.currentTime
    };
    try {
      await sessionStore().update(session.id, patch);
      lastSavedTime = patch.playbackTime;
      saveState = 'saved';
    } catch {
      saveState = 'error';
    }
  }

  function onDocChange(doc: unknown, plainText: string) {
    pendingDoc = doc;
    pendingText = plainText;
    scheduleSave();
  }

  function onEditorReady(api: EditorApi) {
    editorApi = api;
    // Test hook: expose the editor + player to Playwright so e2e can seed
    // whisper-marked text without running Whisper. Harmless in production —
    // no secrets or write paths not already available through the UI.
    if (typeof window !== 'undefined') {
      (window as unknown as { __OTR__: unknown }).__OTR__ = { editor: api, player };
    }
  }

  $effect(() => {
    const t = player.currentTime;
    if (!session) return;
    if (!player.isPlaying && Math.abs(t - lastSavedTime) > 2) {
      scheduleSave();
    }
  });

  onDestroy(() => {
    if (saveTimer) clearTimeout(saveTimer);
    if (session) {
      void sessionStore().update(session.id, {
        text: pendingText,
        textDoc: $state.snapshot(pendingDoc),
        playbackTime: player.currentTime
      });
    }
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
  });

  async function toggleKeymap() {
    keymapMode = keymapMode === 'v1-legacy' ? 'v2-default' : 'v1-legacy';
    await setKeymapMode(keymapMode);
  }

  async function onAttachMedia(event: Event) {
    if (!session) return;
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    await sessionStore().setMedia(session.id, file);
    const store = sessionStore();
    const blob = await store.getMedia(session.id);
    mediaBlob = blob ?? null;
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    mediaUrl = blob ? URL.createObjectURL(blob) : null;
    const updated = await store.get(session.id);
    if (updated) session = updated;
  }

  function onKeydown(event: KeyboardEvent) {
    const km = getKeymap(keymapMode);
    const action = findAction(event, km);
    if (!action) return;
    // Let ProseMirror's own undo/redo keymap win over anything we register.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') return;
    event.preventDefault();
    switch (action) {
      case 'playPause':
        // SPEC §3.2 play-from-cursor: if paused and cursor is inside/after a
        // whisper mark, seek to that mark's start before playing. Skipped when
        // a selection bound is set — `player.play()` will focus the bound and
        // we don't want two seeks stepping on each other.
        if (!player.isPlaying && editorApi && !player.playbackBound) {
          const cursorStart = editorApi.getCursorWhisperStart();
          if (cursorStart !== null && Math.abs(cursorStart - player.currentTime) > 0.25) {
            player.seek(cursorStart);
          }
        }
        player.toggle();
        break;
      case 'skipBack':
        player.skipBack();
        break;
      case 'skipForward':
        player.skipForward();
        break;
      case 'speedDown':
        player.speedDown();
        break;
      case 'speedUp':
        player.speedUp();
        break;
      case 'insertTimestamp':
        if (editorApi) editorApi.insertTimestamp(player.readCurrentTime());
        break;
    }
  }

  const isVideo = $derived(session?.media.type.startsWith('video/') ?? false);
</script>

<svelte:head>
  <title>{session?.title ?? 'Transcript'} · oTranscribe</title>
</svelte:head>
<svelte:window onkeydown={onKeydown} />

<header class="topbar">
  <a href="/" class="back" aria-label="Back to library">← Library</a>
  <h1>{session?.title ?? '…'}</h1>
  <div class="spacer"></div>
  <span class="save-status" data-testid="save-status" data-state={saveState} aria-live="polite">
    {#if saveState === 'pending'}Saving…{:else if saveState === 'saved'}Saved{:else if saveState === 'error'}Error
      saving{/if}
  </span>
  <label class="keymap-toggle" data-testid="keymap-toggle">
    <input
      type="checkbox"
      checked={keymapMode === 'v1-legacy'}
      onchange={toggleKeymap}
      data-testid="keymap-v1-checkbox"
    />
    v1 shortcuts (F1–F4, Esc)
  </label>
</header>

{#if notFound}
  <main>
    <p>Session not found. <a href="/">Return to library.</a></p>
  </main>
{:else if session && initialDoc}
  <main class:has-video={isVideo}>
    <div class="player-region">
      {#if mediaUrl && isVideo}
        <VideoPlayer
          src={mediaUrl}
          {player}
          initialTime={session.playbackTime}
          mediaTitle={session.media.name}
        />
      {:else if mediaUrl}
        <AudioPlayer
          src={mediaUrl}
          {player}
          initialTime={session.playbackTime}
          mediaTitle={session.media.name}
        />
      {:else}
        <div class="no-media" data-testid="no-media">
          <p>
            <strong>No media attached.</strong>
            {#if session.media.name}
              This transcript was imported and references <code>{session.media.name}</code>.
            {/if}
            Attach a matching audio or video file to enable playback.
          </p>
          <input
            type="file"
            accept="audio/*,video/*"
            onchange={onAttachMedia}
            aria-label="Attach media"
            data-testid="attach-media-input"
          />
        </div>
      {/if}
    </div>

    {#if mediaBlob}
      <div class="transcribe-region">
        <TranscribePanel
          audio={mediaBlob}
          initialLanguage={session.language}
          {editorApi}
          onLanguageChange={(lang) => {
            if (session && lang && lang !== 'unknown' && lang !== session.language) {
              void sessionStore().update(session.id, { language: lang });
            }
          }}
        />
      </div>
    {/if}

    <div class="editor-region">
      <Editor
        {initialDoc}
        {player}
        {autoScroll}
        onChange={onDocChange}
        onReady={onEditorReady}
        ariaLabel="Transcript"
        testId="editor"
      />
    </div>
  </main>
{:else}
  <main><p>Loading…</p></main>
{/if}

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 1rem;
    background: var(--color-dark);
    color: white;
    height: var(--height-topbar);
    box-shadow: var(--shadow-topbar);
  }
  .topbar h1 {
    font-size: 1rem;
    margin: 0;
    font-weight: 500;
    max-width: 40ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .back {
    color: white;
    text-decoration: none;
    font-size: 0.85rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-chip);
  }
  .back:hover {
    background: var(--color-dark-hover);
  }
  .spacer {
    flex: 1;
  }
  .keymap-toggle {
    font-size: 0.85rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }
  .save-status {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    min-width: 4rem;
    text-align: right;
  }
  .save-status[data-state='error'] {
    color: #f88;
  }

  main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    padding: 1rem;
    height: calc(100vh - var(--height-topbar));
    margin: 0 auto;
    box-sizing: border-box;
  }

  .player-region {
    grid-column: 1/2;
    grid-row: 1/2;
    background: var(--color-surface);
    border-radius: var(--radius-panel);
    overflow: hidden;
    box-shadow: var(--shadow-panel);
  }

  .editor-region {
    grid-column: 2/3;
    grid-row: 1/3;
    display: flex;
    background: var(--color-surface);
    border-radius: var(--radius-panel);
    box-shadow: var(--shadow-panel);
    overflow: hidden;
    min-height: 0;
  }

  .editor-region :global(.editor) {
    flex: 1;
    min-height: 0;
  }

  .no-media {
    padding: 1.25rem 1rem;
    color: var(--color-text-muted, #555);
    display: grid;
    gap: 0.75rem;
  }
  .no-media p {
    margin: 0;
    font-size: 0.9rem;
  }
  .no-media code {
    background: var(--color-border, #eee);
    padding: 0.05rem 0.25rem;
    border-radius: var(--radius-chip);
    font-size: 0.85rem;
  }
</style>

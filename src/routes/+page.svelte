<script lang="ts">
  import { goto } from '$app/navigation';
  import { formatBytes } from '$lib/format-bytes';
  import { formatTime } from '$lib/player';
  import { sessionStore } from '$lib/storage';
  import type { Session } from '$lib/storage';
  import { detectSessionLanguage } from '$lib/i18n/language';
  import { EXPORT_FORMATS, exportSession, downloadPayload, type ExportFormat } from '$lib/export';
  import { detectImportKind, docFromMarkdown, importOtrFile } from '$lib/import';
  import { t } from '$lib/i18n';
  import { V1_MIGRATION_EVENT } from '$lib/migrate/v1';
  import { onDestroy, onMount } from 'svelte';

  let sessions = $state<Session[]>([]);
  let loading = $state(true);
  let dragging = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);
  let errorMessage = $state<string | null>(null);
  let renamingId = $state<string | null>(null);
  let renameDraft = $state('');
  let exportOpenId = $state<string | null>(null);

  async function refresh() {
    sessions = await sessionStore().list();
    loading = false;
  }

  $effect(() => {
    refresh();
  });

  // Migration runs asynchronously from the layout — refresh the library once
  // it lands so freshly imported v1 sessions appear without a manual reload.
  const onMigration = () => void refresh();
  onMount(() => window.addEventListener(V1_MIGRATION_EVENT, onMigration));
  onDestroy(() => {
    if (typeof window !== 'undefined') window.removeEventListener(V1_MIGRATION_EVENT, onMigration);
  });

  async function acceptFile(file: File) {
    errorMessage = null;
    const store = sessionStore();
    const kind = detectImportKind(file);
    try {
      if (kind === 'audio' || kind === 'video') {
        const session = await store.create({
          title: file.name.replace(/\.[^./]+$/, ''),
          mediaFile: file,
          language: detectSessionLanguage()
        });
        await goto(`/sessions/${session.id}`);
      } else if (kind === 'otr') {
        const parsed = await importOtrFile(file);
        const session = await store.createFromImport({
          title: parsed.title,
          text: parsed.text,
          textDoc: parsed.textDoc,
          language: parsed.language ?? detectSessionLanguage(),
          playbackTime: parsed.playbackTime,
          media: {
            name: parsed.mediaHint ?? '',
            type: '',
            size: 0
          }
        });
        await goto(`/sessions/${session.id}`);
      } else if (kind === 'markdown') {
        const source = await file.text();
        const textDoc = docFromMarkdown(source);
        const session = await store.createFromImport({
          title: file.name.replace(/\.(md|markdown)$/i, ''),
          text: source,
          textDoc,
          language: detectSessionLanguage(),
          playbackTime: 0,
          media: { name: '', type: '', size: 0 }
        });
        await goto(`/sessions/${session.id}`);
      } else {
        errorMessage = `"${file.name}" isn't a supported file (${file.type || 'unknown type'}). Try audio, video, .otr, or .md.`;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : `Failed to import "${file.name}".`;
    }
  }

  function onPick(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) acceptFile(file);
    target.value = '';
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) acceptFile(file);
  }

  function relativeTime(ms: number): string {
    const diff = Date.now() - ms;
    const min = 60_000;
    const hr = 60 * min;
    const day = 24 * hr;
    if (diff < min) return 'just now';
    if (diff < hr) return `${Math.floor(diff / min)} min ago`;
    if (diff < day) return `${Math.floor(diff / hr)} hr ago`;
    return `${Math.floor(diff / day)} d ago`;
  }

  async function onDelete(session: Session) {
    if (!confirm(`Delete "${session.title}"? This cannot be undone.`)) return;
    await sessionStore().delete(session.id);
    await refresh();
  }

  function startRename(session: Session) {
    renamingId = session.id;
    renameDraft = session.title;
    exportOpenId = null;
  }

  async function commitRename() {
    if (!renamingId) return;
    const id = renamingId;
    const title = renameDraft.trim();
    renamingId = null;
    if (!title) return;
    const current = sessions.find((s) => s.id === id);
    if (current && current.title === title) return;
    await sessionStore().update(id, { title });
    await refresh();
  }

  function cancelRename() {
    renamingId = null;
    renameDraft = '';
  }

  function onRenameKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commitRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
  }

  async function onDuplicate(session: Session) {
    exportOpenId = null;
    await sessionStore().duplicate(session.id);
    await refresh();
  }

  function toggleExport(session: Session) {
    exportOpenId = exportOpenId === session.id ? null : session.id;
  }

  function onExport(session: Session, format: ExportFormat) {
    exportOpenId = null;
    const payload = exportSession(session, session.textDoc ?? null, format);
    downloadPayload(payload);
  }

  /**
   * Use-directive autofocus. Cleaner than the `autofocus` attribute (Svelte
   * explicitly warns against it) and doesn't fight the a11y linter.
   */
  function autofocus(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

<svelte:head>
  <title>Library · oTranscribe</title>
</svelte:head>

<svelte:window
  onclick={(e) => {
    // Close the export menu when clicking outside any row-action button.
    if (exportOpenId && !(e.target as HTMLElement).closest('.row-actions')) {
      exportOpenId = null;
    }
  }}
/>

<header class="topbar">
  <h1>oTranscribe</h1>
  <span class="version">v2 alpha</span>
  <span class="spacer"></span>
  <a href="/settings" class="settings-link">Settings</a>
</header>

<main
  class:dragging
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={() => (dragging = false)}
  ondrop={onDrop}
>
  <section class="new-transcript">
    <h2>New transcript</h2>
    <p>Drop an audio, video, .otr, or .md file here — or pick one.</p>
    <input
      bind:this={fileInput}
      type="file"
      accept="audio/*,video/*,.otr,.md,.markdown"
      onchange={onPick}
      class="visually-hidden"
      aria-label="Choose an audio, video, .otr, or .md file"
      data-testid="file-input"
    />
    <button type="button" class="primary" onclick={() => fileInput?.click()}>
      {t('choose-file')}
    </button>
    {#if errorMessage}
      <p class="error" role="alert">{errorMessage}</p>
    {/if}
  </section>

  <section class="library" aria-labelledby="library-heading">
    <h2 id="library-heading">Your transcripts</h2>
    {#if loading}
      <p>Loading…</p>
    {:else if sessions.length === 0}
      <p class="empty">No transcripts yet. Load a file above to get started.</p>
    {:else}
      <ul class="sessions" data-testid="session-list">
        {#each sessions as session (session.id)}
          <li class="session">
            {#if renamingId === session.id}
              <div class="row rename-row">
                <input
                  type="text"
                  class="rename-input"
                  bind:value={renameDraft}
                  onkeydown={onRenameKeydown}
                  onblur={commitRename}
                  aria-label="Rename {session.title}"
                  data-testid="rename-input"
                  use:autofocus
                />
                <span class="meta">
                  {session.media.name} · {formatBytes(session.media.size)}
                  {#if session.media.duration}· {formatTime(session.media.duration)}{/if}
                </span>
              </div>
            {:else}
              <a href="/sessions/{session.id}" class="row" data-testid="session-row">
                <span class="title">{session.title}</span>
                <span class="meta">
                  {session.media.name} · {formatBytes(session.media.size)}
                  {#if session.media.duration}· {formatTime(session.media.duration)}{/if}
                </span>
                <span class="updated">{relativeTime(session.updatedAt)}</span>
              </a>
            {/if}
            <div class="row-actions">
              <button
                type="button"
                class="row-action"
                onclick={() => startRename(session)}
                aria-label="Rename {session.title}"
                data-testid="rename-btn"
              >
                Rename
              </button>
              <button
                type="button"
                class="row-action"
                onclick={() => onDuplicate(session)}
                aria-label="Duplicate {session.title}"
                data-testid="duplicate-btn"
              >
                Duplicate
              </button>
              <div class="export-wrap">
                <button
                  type="button"
                  class="row-action"
                  onclick={() => toggleExport(session)}
                  aria-haspopup="menu"
                  aria-expanded={exportOpenId === session.id}
                  aria-label="Export {session.title}"
                  data-testid="export-btn"
                >
                  Export ▾
                </button>
                {#if exportOpenId === session.id}
                  <ul class="export-menu" role="menu" data-testid="export-menu">
                    {#each EXPORT_FORMATS as fmt (fmt.id)}
                      <li>
                        <button
                          type="button"
                          role="menuitem"
                          onclick={() => onExport(session, fmt.id)}
                          data-testid="export-{fmt.id}"
                        >
                          {fmt.label}
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
              <button
                type="button"
                class="row-action danger"
                onclick={() => onDelete(session)}
                aria-label="Delete {session.title}"
              >
                Delete
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</main>

<style>
  .topbar {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    background: var(--color-dark);
    color: white;
    height: var(--height-topbar);
    box-shadow: var(--shadow-topbar);
  }
  .topbar h1 {
    font-size: 1rem;
    margin: 0;
  }
  .version {
    font-size: 0.75rem;
    opacity: 0.6;
  }
  .spacer {
    flex: 1;
  }
  .settings-link {
    color: white;
    text-decoration: none;
    font-size: 0.85rem;
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-chip);
  }
  .settings-link:hover {
    background: var(--color-dark-hover);
  }

  main {
    max-width: 720px;
    margin: 2rem auto;
    padding: 0 1rem;
  }
  main.dragging {
    outline: 3px dashed var(--color-accent);
    outline-offset: -12px;
  }

  section {
    background: var(--color-surface);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow-panel);
    border-radius: var(--radius-panel);
  }
  section h2 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    color: var(--color-accent);
  }

  .primary {
    background: var(--color-accent);
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: var(--radius-chip);
    cursor: pointer;
    font: inherit;
  }
  .primary:hover {
    background: var(--color-accent-light);
  }

  .error {
    color: #a00;
    margin: 0.75rem 0 0;
  }

  .empty {
    color: var(--color-text-muted);
  }

  .sessions {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .session {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    border-top: 1px solid #eee;
    padding: 0.75rem 0;
    gap: 0.35rem;
    min-width: 0;
  }
  .session:first-child {
    border-top: none;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    gap: 0.25rem 1rem;
    text-decoration: none;
    color: inherit;
    min-width: 0;
  }
  .row:hover {
    background: rgba(0, 0, 0, 0.02);
  }
  .row .title {
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row .updated {
    grid-row: 1;
    grid-column: 2;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    text-align: right;
    white-space: nowrap;
  }
  .row .meta {
    grid-column: 1 / -1;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rename-row {
    grid-template-columns: 1fr;
  }
  .rename-input {
    font: inherit;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border, #ccc);
    border-radius: var(--radius-chip);
    width: 100%;
    box-sizing: border-box;
  }
  .row-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.35rem;
    position: relative;
  }
  .row-action {
    background: transparent;
    border: 1px solid #ddd;
    border-radius: var(--radius-chip);
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .row-action:hover {
    background: #f5f5f5;
  }
  .row-action.danger {
    color: #a00;
  }
  .row-action.danger:hover {
    background: #fdecec;
  }
  .export-wrap {
    position: relative;
  }
  .export-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    list-style: none;
    margin: 0;
    padding: 0.25rem 0;
    background: white;
    border: 1px solid var(--color-border, #ddd);
    border-radius: var(--radius-chip);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    min-width: 14rem;
    z-index: 10;
  }
  .export-menu li button {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 0.4rem 0.75rem;
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
    color: inherit;
  }
  .export-menu li button:hover {
    background: var(--color-surface-hover, #f5f5f5);
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

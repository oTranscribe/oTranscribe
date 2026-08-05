<script lang="ts">
  import { formatBytes } from '$lib/format-bytes';
  import { MODEL_CATALOG, modelUrl } from '$lib/models/catalog';
  import type { WhisperModel } from '$lib/models/catalog';
  import { modelStore, type DownloadEvent } from '$lib/models/store';
  import {
    DEFAULT_AUTO_SCROLL,
    DEFAULT_LOW_CONFIDENCE_THRESHOLD,
    getAutoScroll,
    getLowConfidenceThreshold,
    setAutoScroll,
    setLowConfidenceThreshold
  } from '$lib/settings';
  import { setLowConfidenceThreshold as setSchemaLowConfidenceThreshold } from '$lib/editor/schema';
  import { dumpV1Storage, discoverV1Backups } from '$lib/migrate/v1';
  import { getUiLocale, setUiLocale } from '$lib/settings';
  import { LOCALES, setActiveLocale, DEFAULT_LOCALE } from '$lib/i18n';

  let autoScroll = $state(DEFAULT_AUTO_SCROLL);
  let lowConfidence = $state(DEFAULT_LOW_CONFIDENCE_THRESHOLD);
  let uiLocale = $state(DEFAULT_LOCALE);
  let prefsLoaded = $state(false);
  let v1BackupCount = $state<number | null>(null);

  $effect(() => {
    void (async () => {
      autoScroll = await getAutoScroll();
      lowConfidence = await getLowConfidenceThreshold();
      uiLocale = await getUiLocale();
      setSchemaLowConfidenceThreshold(lowConfidence);
      prefsLoaded = true;
      try {
        v1BackupCount = discoverV1Backups(window.localStorage).length;
      } catch {
        v1BackupCount = 0;
      }
    })();
  });

  async function onLocaleChange(next: string) {
    uiLocale = next;
    setActiveLocale(next);
    await setUiLocale(next);
  }

  function downloadV1Dump() {
    try {
      const body = dumpV1Storage(window.localStorage);
      const blob = new Blob([body], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'otranscribe-v1-backup.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('v1 dump failed', err);
    }
  }

  async function onAutoScrollChange(next: boolean) {
    autoScroll = next;
    await setAutoScroll(next);
  }

  async function onLowConfidenceChange(next: number) {
    lowConfidence = next;
    setSchemaLowConfidenceThreshold(next);
    await setLowConfidenceThreshold(next);
  }

  interface RowState {
    cached: boolean;
    size: number;
    downloading: boolean;
    loaded: number;
    total: number;
    error: string | null;
  }

  let rows = $state<Record<string, RowState>>({});
  let controllers = new Map<string, AbortController>();

  $effect(() => {
    void refresh();
  });

  async function refresh() {
    const list = await modelStore().list();
    const cachedById = new Map(list.map((m) => [m.id, m.size]));
    const next: Record<string, RowState> = {};
    for (const m of MODEL_CATALOG) {
      next[m.id] = {
        cached: cachedById.has(m.id),
        size: cachedById.get(m.id) ?? 0,
        downloading: rows[m.id]?.downloading ?? false,
        loaded: rows[m.id]?.loaded ?? 0,
        total: rows[m.id]?.total ?? m.approxSize,
        error: rows[m.id]?.error ?? null
      };
    }
    rows = next;
  }

  async function download(model: WhisperModel) {
    const controller = new AbortController();
    controllers.set(model.id, controller);
    rows = {
      ...rows,
      [model.id]: {
        ...(rows[model.id] ?? {
          cached: false,
          size: 0,
          downloading: false,
          loaded: 0,
          total: model.approxSize,
          error: null
        }),
        downloading: true,
        loaded: 0,
        total: model.approxSize,
        error: null
      }
    };

    const listener = (event: DownloadEvent) => {
      const current = rows[model.id]!;
      switch (event.type) {
        case 'start':
          rows = { ...rows, [model.id]: { ...current, total: event.total } };
          break;
        case 'progress':
          rows = {
            ...rows,
            [model.id]: {
              ...current,
              loaded: event.progress.loaded,
              total: event.progress.total
            }
          };
          break;
        case 'complete':
          rows = {
            ...rows,
            [model.id]: { ...current, downloading: false, cached: true, size: current.total }
          };
          controllers.delete(model.id);
          void refresh();
          break;
        case 'canceled':
          rows = { ...rows, [model.id]: { ...current, downloading: false } };
          controllers.delete(model.id);
          break;
        case 'error':
          rows = {
            ...rows,
            [model.id]: {
              ...current,
              downloading: false,
              error: event.error instanceof Error ? event.error.message : String(event.error)
            }
          };
          controllers.delete(model.id);
          break;
      }
    };

    try {
      await modelStore().download(model, listener, controller.signal);
    } catch {
      // Listener already recorded the failure.
    }
  }

  function cancel(id: string) {
    controllers.get(id)?.abort();
  }

  async function remove(id: string) {
    await modelStore().remove(id);
    await refresh();
  }
</script>

<svelte:head><title>Settings · oTranscribe</title></svelte:head>

<header class="topbar">
  <a href="/" class="back" aria-label="Back to library">← Library</a>
  <h1>Settings</h1>
</header>

<main>
  <section>
    <h2>Language</h2>
    <label class="row-inline">
      <span>
        <strong>Interface language</strong>
        <span class="hint">
          Overrides the browser default. Full string coverage lands progressively — untranslated UI
          still renders in English.
        </span>
      </span>
      <select
        value={uiLocale}
        onchange={(e) => void onLocaleChange((e.currentTarget as HTMLSelectElement).value)}
        disabled={!prefsLoaded}
        data-testid="setting-ui-locale"
        aria-label="Interface language"
      >
        {#each LOCALES as locale (locale.code)}
          <option value={locale.code}>{locale.label}</option>
        {/each}
      </select>
    </label>
  </section>

  <section>
    <h2>Editor</h2>
    <label class="row-inline">
      <input
        type="checkbox"
        checked={autoScroll}
        onchange={(e) => void onAutoScrollChange((e.currentTarget as HTMLInputElement).checked)}
        data-testid="setting-autoscroll"
      />
      <span>
        <strong>Follow the playhead</strong>
        <span class="hint">Scroll the transcript to keep the currently-spoken word in view.</span>
      </span>
    </label>

    <label class="row-inline">
      <span>
        <strong>Low-confidence threshold</strong>
        <span class="hint">
          Whisper words scoring below this get a wavy underline. {(lowConfidence * 100).toFixed(0)}%
        </span>
      </span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={lowConfidence}
        oninput={(e) =>
          void onLowConfidenceChange(Number((e.currentTarget as HTMLInputElement).value))}
        disabled={!prefsLoaded}
        data-testid="setting-lowconfidence"
        aria-label="Low-confidence threshold"
      />
    </label>
  </section>

  {#if v1BackupCount !== null && v1BackupCount > 0}
    <section>
      <h2>Legacy v1 data</h2>
      <p class="hint">
        We found {v1BackupCount} v1 backup{v1BackupCount === 1 ? '' : 's'} in your browser storage.
        {#if v1BackupCount > 0}
          They've been imported into the library. Download the raw payload if you'd like a copy
          before we ever clear it.
        {/if}
      </p>
      <button type="button" onclick={downloadV1Dump} data-testid="download-v1-dump">
        Download raw v1 data
      </button>
    </section>
  {/if}

  <section>
    <h2>Whisper models</h2>
    <p class="hint">
      Models are cached locally in OPFS after download. Delete any you're not using to free space.
    </p>
    <ul class="models" data-testid="model-catalog">
      {#each MODEL_CATALOG as model (model.id)}
        {@const row = rows[model.id]}
        <li data-model-id={model.id}>
          <div class="row-main">
            <div>
              <strong>{model.label}</strong>
              <span class="tag" data-coverage={model.coverage}>
                {model.coverage === 'english-only' ? 'English only' : 'Multilingual'}
              </span>
              <p class="hint">{model.description}</p>
            </div>
            <div class="row-meta">
              {#if row?.cached}
                <span class="cached-badge">Cached · {formatBytes(row.size)}</span>
                <button type="button" onclick={() => remove(model.id)}>Delete</button>
              {:else if row?.downloading}
                <span class="cached-badge">
                  {formatBytes(row.loaded)} / {formatBytes(row.total)}
                </span>
                <button type="button" onclick={() => cancel(model.id)}>Cancel</button>
              {:else}
                <span class="cached-badge">~{formatBytes(model.approxSize)}</span>
                <button type="button" onclick={() => download(model)}>Download</button>
              {/if}
            </div>
          </div>
          {#if row?.downloading}
            <div class="progress" aria-hidden="true">
              <div
                class="fill"
                style:width="{Math.round((row.loaded / (row.total || model.approxSize)) * 100)}%"
              ></div>
            </div>
          {/if}
          {#if row?.error}
            <p class="error" role="alert">Error: {row.error}</p>
          {/if}
          {#if !model.sha256}
            <p class="warning">
              No checksum pinned yet — download is not verified.
              <a href={modelUrl(model)} target="_blank" rel="noopener noreferrer">source</a>
            </p>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
</main>

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
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
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
  main {
    max-width: 720px;
    margin: 2rem auto;
    padding: 0 1rem;
    display: grid;
    gap: 1.5rem;
  }
  section h2 {
    font-size: 1rem;
    margin: 0 0 0.25rem;
  }
  .row-inline {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.75rem;
    background: var(--color-surface);
    border-radius: var(--radius-panel);
    box-shadow: var(--shadow-panel);
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
  }
  .row-inline span strong {
    display: block;
  }
  .row-inline span .hint {
    display: block;
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-muted, #666);
  }
  .row-inline input[type='range'] {
    width: 12rem;
    justify-self: end;
  }
  .hint {
    margin: 0 0 1rem;
    color: var(--color-text-muted, #666);
    font-size: 0.85rem;
  }
  .models {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.75rem;
  }
  .models li {
    background: var(--color-surface);
    border-radius: var(--radius-panel);
    box-shadow: var(--shadow-panel);
    padding: 0.75rem 1rem;
    display: grid;
    gap: 0.5rem;
  }
  .row-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  .row-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.35rem;
    font-size: 0.8rem;
  }
  .cached-badge {
    color: var(--color-text-muted, #666);
    font-size: 0.75rem;
  }
  .tag {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.1rem 0.35rem;
    border-radius: var(--radius-chip);
    background: var(--color-border, #eee);
    color: var(--color-text-muted, #666);
    margin-left: 0.5rem;
  }
  button {
    font-size: 0.85rem;
    padding: 0.3rem 0.75rem;
    border-radius: var(--radius-chip);
    border: 1px solid var(--color-border, #ccc);
    background: white;
    cursor: pointer;
  }
  .progress {
    height: 0.35rem;
    background: var(--color-border, #eee);
    border-radius: 999px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--color-accent);
    transition: width 120ms linear;
  }
  .error {
    color: #b00;
    font-size: 0.8rem;
    margin: 0;
  }
  .warning {
    color: #a55;
    font-size: 0.75rem;
    margin: 0;
  }
</style>

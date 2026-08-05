<script lang="ts">
  import { browser } from '$app/environment';
  import '../lib/tokens.css';
  import '../lib/global.css';
  import { preloadDefaultModel } from '$lib/models/preload.svelte';
  import { runV1Migration } from '$lib/migrate/v1';
  import { getUiLocale } from '$lib/settings';
  import { setActiveLocale } from '$lib/i18n';

  let { children } = $props();

  // Kick off the tiny.en background preload once the app has loaded.
  // SPEC §3.1: unobtrusive, cache-first, silent unless the user asks to transcribe
  // before it finishes. Idempotent across navigations.
  if (browser) {
    void preloadDefaultModel();
    // v1 → v2 migration runs once per browser storage. Idempotent — a marker
    // setting keeps subsequent boots from re-importing.
    void runV1Migration().catch((err) => console.warn('v1 migration failed', err));
    // Restore the saved UI locale before the first paint.
    void getUiLocale().then(setActiveLocale);
  }
</script>

{@render children()}

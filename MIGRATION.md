# v1 → v2 migration guide

## For users

Everything happens automatically. When you first load v2 in a browser where you'd used v1:

1. **Autosaves and backups are imported.** v1 kept an autosave and up to 100 timestamped backups in your browser's local storage. v2 finds those on first launch and turns each into a session in the new library. Every import is titled `v1 Autosave · <date>` or `v1 Backup · <date>` so you can spot them.

2. **Media files aren't included.** v1's backups saved the transcript HTML but not the audio (audio was too big for `localStorage`). Each imported session shows a **"No media attached"** panel — click **Attach media** and pick the original audio or video file. The transcript, timestamps, and playback position remain intact.

3. **Your originals are left alone.** Nothing in v1's `localStorage` is deleted by the migration. If v2 misinterprets a backup, your v1 data is still there. Settings → **Download raw v1 data** saves the complete v1 storage payload as JSON for archival.

## For self-hosters

v2 has one hard requirement v1 didn't: two HTTP headers on the served origin.

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These enable `SharedArrayBuffer`, which the threaded Whisper build (and the FFmpeg extraction path) depend on. `static/_headers` in the repo is preconfigured for Netlify and Cloudflare Pages. For Apache or Nginx, add the equivalent `Header set` / `add_header` directives to the config for `/`.

Without these headers, v2 will still load but transcription falls back to the single-threaded WASM build — roughly 2–3× slower, and the FFmpeg video-extraction path stops working entirely.

## For integrators (`.otr` files)

- **`.otr` v1 files remain fully importable.** v2's importer reads the v1 shape (`text`, `media`, `media-time`, `media-source`) and hydrates a session with the transcript and timestamps preserved.
- **`.otr` v2 is a superset.** New fields: `otrVersion: 2`, `sessionId`, `textDoc` (ProseMirror JSON — the editor's source of truth), `language`, `whisperRanges`, and `syncMeta: null`. v1-only tools that read `text` continue to work; v2-aware tools should prefer `textDoc`.
- **Whisper timing is preserved in `text`.** The v2 export's HTML `text` field wraps each Whisper-attributed run in `<span class="whisper" data-start data-end data-confidence>`. Consumers that only care about the plain reading order can ignore those attributes.

## Deprecation window

Once v2 is deployed at `otranscribe.com`, v1 will continue to be served from `legacy.otranscribe.com` for a documented period (target: 6 months). During that window a banner on v1 will direct users to v2.

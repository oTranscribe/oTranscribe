# Changelog

## [2.0.0-alpha] — in development

The v2 rebuild. See [`SPEC.md`](./SPEC.md) and [`PLAN.md`](./PLAN.md) for the design and phased plan.

### Added

- **In-browser transcription** via whisper.cpp WASM (`@transcribe/shout` + `@transcribe/transcriber`). Model management with progress and OPFS caching. Streaming segment insertion into the editor with `whisper` marks carrying `{start, end, confidence}`.
- **ProseMirror editor** with `timestamp` nodes and `whisper` marks. Click-to-seek, play-from-cursor, selection→playbackBound, typing-during-playback auto-attribution, low-confidence wavy underlines, auto-scroll to the active word.
- **Session library** with drag-drop / file-picker import, drag-drop reorder pending, rename, duplicate, delete, and per-format export.
- **Export formats**: `.otr` v2 (superset of v1), `.otr` v1 (interop), Markdown, plain text, WebVTT, SubRip.
- **Import formats**: audio, video, `.otr` v1 + v2, Markdown.
- **v1 → v2 migration**: on first launch, v1 autosaves and backups in `localStorage` are imported into the new session store. A "Download raw v1 data" escape hatch preserves the original payload.
- **Video file transcription**: FFmpeg.wasm (core-mt) is lazily loaded on the first video that Web Audio can't decode natively; extracts audio and hands off to the existing transcribe pipeline.
- **Client-side audio chunking**: files longer than the WASM memory ceiling are split into 10-minute chunks; timestamps are re-based per chunk before insertion.
- **Cross-origin isolation**: COOP + COEP headers wired for Netlify / Cloudflare Pages, enabling threaded WASM.
- **Settings**: model catalog (download / delete / verify), interface language picker (24 locales, English + top-5 verified), keyboard shortcut mode toggle (v1 legacy vs v2 default), low-confidence threshold, auto-scroll toggle.
- **Autosave** in Dexie / IndexedDB with a visible saving/saved/error status. All persistence goes through a `SessionStore` seam so future cloud backup is a bounded addition.
- **Zero telemetry**: no analytics, no fetches to third parties. Everything runs local.

### Changed from v1

- Storage moved from `localStorage` to IndexedDB via Dexie (via `SessionStore`). Larger transcripts and media blobs, transactional writes, no `localStorage` quota ceilings.
- Rich-text editing replaced `contentEditable` HTML with a schema-validated ProseMirror doc. Timestamps are structured nodes; whisper timing is a mark, not a `<span>`.
- Keyboard defaults changed. v1's F1/F2/F3/F4/Esc shortcuts still available via a Settings toggle; v2's defaults use `Ctrl+,` `Ctrl+.` `Ctrl+/` etc. — the v1 modifierless F-keys collided with browser reserved keys in some setups.
- Translations moved from webL10n INI to a compact JSON runtime with a testable build script. Contributor workflow stays INI-based.

### Removed

- YouTube URL support: v2 focuses on local files. Roadmap item.
- Google Drive send-to: v2 has zero cloud integrations by design (see roadmap re: opt-in MuckRock backup).
- Manual Cmd+S backup panel: autosave now runs continuously; export replaces manual backup.

### Bug fixes from the v2 development cycle

- **Malformed WASM SIMD probe** caused every browser to fall back to the no-SIMD Whisper build (2–3× slower). Rewrote the probe as a well-formed `() -> v128` function using `i32x4.splat`; pinned by `backend.test.ts` and a Playwright regression check.
- **Chunk 2 hang** during long-file transcription: `@transcribe/transcriber`'s `_loadAudio` decodes each chunk in a fresh AudioContext and never closes them, saturating Chrome's concurrent-context limit. Bypassed by passing raw Float32 PCM directly to Whisper and monkey-patching `_loadAudio` to identity.

## [1.x] — legacy

The v1 codebase is preserved in `legacy/`. See its history in `legacy/README.md` and the pre-v2 commits.

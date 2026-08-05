# oTranscribe v2 — Specification (Draft)

> **Status:** Second draft. Written 2026-08-04, revised 2026-08-05.
> **Owner:** MuckRock Foundation.
> **Purpose:** Modernize oTranscribe from a manual-transcription text editor (2015) into a private, local, browser-based transcription workstation that runs Whisper on-device and edits transcripts in a structured editor tightly bound to playback.

---

## 1. Vision & Guiding Principles

oTranscribe was built in 2015 to help journalists transcribe interviews by hand, using a text editor tightly coupled to an audio player. The ground has shifted: Whisper-class ASR models now run entirely in-browser via WebAssembly, and structured rich-text editors like ProseMirror have matured. v2 keeps what made the tool distinctive and rebuilds around those capabilities.

### Guiding principles

1. **Private by default.** Out of the box, audio, transcripts, and models stay on the user's device. No transcript ever leaves the browser unless the user exports it. Third-party ASR is not used.
2. **Offline-capable.** Once the app and a chosen model are cached, the tool works with no network connection — on a plane, in the field, in a courthouse basement.
3. **Local-first storage.** Transcripts persist locally (IndexedDB) and survive reload. Any future cloud persistence is **opt-in, additive, and never a requirement to use the tool.**
4. **Journalist-centric.** Keyboard-first workflow, precise playback control, timestamp accuracy, easy quotation lookup. The editor works *with* the audio, not around it.
5. **Free and open.** Continues as an MIT-licensed, community-maintained project under MuckRock.

### On accounts and cloud (roadmap posture)

Losing transcripts is a real complaint with v1. MuckRock has an accounts system, and opt-in cloud persistence (transcript sync, backup, cross-device access) is a legitimate future enhancement — see §9 Future Work.

The v2 architecture **MUST NOT paint that future into a corner.** Concretely, this means:
- All persistence is accessed through a session-store abstraction, not raw Dexie calls scattered across components.
- Session records carry stable UUIDs.
- The `.otr` v2 format has a place for account/sync metadata even though MVP never populates it.

Cloud persistence is **not** MVP scope. But MVP shouldn't need a schema rewrite to add it.

### What v2.0 is explicitly *not* doing

- A cloud SaaS or hosted-transcription service (backup ≠ transcription-in-the-cloud; the latter is not on the roadmap).
- YouTube extraction or download — see §3.4.
- Speaker diarization, live/microphone transcription, or collaboration — all §9 roadmap.

---

## 2. Target Users & Primary Use Cases

**Primary user:** A working journalist who has an audio or video interview and needs a clean, timestamped transcript they can quote from — without uploading the recording anywhere.

**Secondary users:** Researchers, podcasters, ethnographers, lawyers taking depositions, students, historians working with oral-history archives.

### Key user journeys

1. **Auto-transcribe an interview.** Load an mp3, pick a Whisper model, watch the transcript populate with timestamped segments, then edit for accuracy.
2. **Correct while listening.** Play back the audio; the currently-spoken word/segment is highlighted; **pause and click any word to seek**; edit in place. Clicking during playback does not seek — it just parks the caret so the user can fix a typo without the playhead jumping. Explicit seek gestures during playback are timestamp-chip clicks and the play-from-cursor shortcut. Selecting a range scopes playback to that range.
3. **Transcribe a video file.** Load an mp4/webm/mov; audio is extracted client-side (see §3.4); transcription runs against the extracted audio; playback shows video with the transcript alongside.
4. **Export a clean transcript.** Download as plain text, Markdown, WebVTT/SRT, or `.otr` (JSON, backwards-compatible).
5. **Resume yesterday's work.** Reopen the app; the library shows recent sessions; one-click restore the audio + transcript + last playback position.
6. **Insert a manual timestamp.** While playing, press the shortcut to drop an inline `[HH:MM:SS]` chip at the cursor. Useful even in auto-transcribed docs, e.g., when annotating a moment that Whisper didn't segment cleanly.

### Keyboard shortcuts and legacy compatibility

v2 defines a fresh, better-considered default keymap. A settings toggle enables the **oTranscribe v1 shortcut set** (Esc, F1/F2, F3/F4, Cmd/Ctrl-\` etc.) for users with existing muscle memory. Only one set is active at a time.

---

## 3. Feature Scope (v2.0 MVP)

### 3.0 Transcript Library

A landing / library page that lists all locally-saved transcripts, sortable by recency and searchable by title. Actions per row: open, rename, duplicate, export, delete.

- **MVP:** flat list.
- **Roadmap:** grouping into projects, full-text search across transcripts.

Creating a new transcript is a first-class action on this page (upload audio/video, drag-drop, or start empty).

### 3.1 Automatic Transcription (Whisper via WebAssembly)

**Engine.** whisper.cpp compiled to WebAssembly, wrapped via [transcribe.js](https://github.com/transcribejs/transcribe.js). transcribe.js is mature (v3, released within the last year, no open issues) and gives us a maintained TypeScript surface. If it proves inadequate we roll our own bindings later — transcribe.js also serves as reference implementation for that path. Prior art: [projecte-aina/oTranscribe-plus](https://github.com/projecte-aina/oTranscribe-plus).

**Model tiers.**
- **Default: `ggml-tiny.en`** (~75 MB). **Not bundled** into the app payload. Lazy-loaded automatically after the page finishes loading, without user interaction, so it's ready by the time a user asks for it. Progress is unobtrusive; cache hits from OPFS make repeat visits instant.
- **Larger models:** `base`, `small`, `medium`, `large-v3-turbo`. **Fetch-on-first-use** from a **MuckRock-hosted CDN mirror** (see §7 for hosting rationale). Size/quality trade-offs surfaced in the UI (e.g., "large-v3-turbo: 1.5 GB, best accuracy, slower on low-end hardware").
- **Bring-your-own model:** roadmap (§9). BYO will support drag-drop `ggml-*.bin` and direct Hugging Face URLs.

**Cache management.** Downloaded models live in OPFS. A settings panel lists cached models with size + delete controls. Downloads show progress and can be cancelled/resumed.

**Runtime.**
- Transcription runs in a dedicated **Web Worker**; the UI thread stays responsive.
- Model download and app-shell caching are handled by a **Service Worker**. This is what enables offline use and moves model-fetching off the main thread.
- Progress is reported per-segment; segments stream into the editor as they finish.
- The user can pause/cancel a run in progress.
- Hardware acceleration: prefer WebGPU where available; fall back to WASM SIMD threads; fall back again to single-threaded WASM. Detected at load time; the UI indicates which backend is active.

**Segment output.** Each Whisper segment yields `{ text, start, end, confidence }`. Confidence is preserved into the editor as a per-word attribute on the `whisper` mark (see §3.2), enabling low-confidence flagging.

**Language.** Default = the user's browser locale (from `navigator.language`), with a manual override selector at the "start transcription" moment. Language auto-detection is a roadmap item (§9).

### 3.2 Structured Editor (ProseMirror)

**Why ProseMirror.** v1 uses `contentEditable` with DOM-scraped timestamps. That's fragile: cursor management is buggy, undo is unpredictable, and any extension (highlighting the currently-playing word, block-level structure) hits the limits of `execCommand`. ProseMirror gives us a first-class document model, a real transaction log, and clean extension points.

**MVP scope: plain text + timestamps + whisper alignment.** Markdown formatting (bold, italic, headings, lists, quotes) is **not MVP** — it's a roadmap item (§9). The MVP editor must render, edit, and export a plain-text transcript with `whisper` marks and inline `timestamp` nodes; nothing more.

**Schema (v2.0 MVP).**
- **Doc** ::= (Block)+
- **Block** ::= `paragraph`
- **Inline** ::= `text` | `timestamp` | `hardBreak`
- **Marks** ::= `whisper`

(Additional block types and formatting marks — `heading`, `blockquote`, lists, `bold`, `italic`, `code`, `link` — are held for the Markdown-editing roadmap milestone.)

**`whisper` mark.** Attached to text that came from a Whisper segment. Carries `{ start: number, end: number, confidence: number }`. This is the source of truth for word↔audio alignment.

**`timestamp` node.** Inline, atomic (chip-like), carries `{ time: number }`. Rendered as `[HH:MM:SS]`. Clicking seeks the player.

**Mark propagation and split behavior.**
- Splitting a `whisper`-marked range keeps the *same* start/end on both halves — because we still know the range contains the same audio. This is deliberate: it means partial matches are common and useful (see highlighting).
- Deleting text deletes the mark.
- Typing new text into a marked range inherits the surrounding mark's `{start, end}` — best-effort alignment.

**Confidence rendering.** Words with low Whisper confidence are rendered with a subtle wavy underline, similar to a spell-check indicator. Threshold is tunable; only low-confidence words are flagged (high-confidence text renders normally). This helps users find likely errors.

**Cursor ↔ playhead sync (core interaction model).**

The editor and the media player are two views on the same timeline. State flows both ways:

- **Playback → editor.** The `whisper` mark(s) whose `{start, end}` bracket the current playhead time are highlighted with a **solid fill**. Marks that only match on `start` OR `end` (partial matches, common after edits) are highlighted with a **gradient fill** going from transparent to solid in the direction of the matching value. This makes edited/refined regions read differently from pristine Whisper output.
- **Editor → playback (Play key).** Pressing the play shortcut starts audio from the timestamp associated with the `whisper` mark at the cursor position (or the nearest preceding mark).
- **Click a whisper-marked word (paused only).** Seeks the player to that mark's start and parks the caret there. During playback the click just parks the caret — no seek — so editors can fix typos in-flight without the playhead jumping. Revised 2026-08-07 after Phase 4 dogfooding; the earlier draft seeked on every click regardless of play state.
- **Selection → playback bound (paused-only).** While the player is paused, selecting a text range sets `playbackBound = [first mark's start, last mark's end]`. On the next paused→play transition, playback focuses on the bound — `PlayerContext.play()` seeks to `bound.start` if the playhead is outside the range — and then **loops** within it. Hitting the end wraps back to the start until the user pauses. Selection changes **during** playback are ignored — audio never jerks around just because the user selected something to look at or edit. To change the loop range, pause, adjust the selection, then play again. Revised 2026-08-07 after Phase 4 dogfooding (earlier draft was "plays once and stops"; then "loops but selection-change during play also re-seeks"). The paused-only rule keeps play/pause a stable mode.
- **Typing during playback → time-stamped writes.** A debounced tracker follows the play position:
  - When typing begins, record the play position as `start`.
  - When the debounce timer fires (no keystrokes for N ms), record the play position as `end`.
  - Apply a `whisper` mark with `{start, end, confidence: 1.0}` to the text written during the debounce window.
  - This means manual-transcription-style workflows produce time-aligned text automatically.
- **Timestamp insertion shortcut.** Inserts a `timestamp` node at the cursor, `time` = current playhead.

**Standard shortcuts.**
- Play/pause, skip, speed — see §3.3.
- Undo/redo — Cmd/Ctrl-Z, Shift-Cmd/Ctrl-Z.
- Timestamp insertion — v2 default (TBD), or Cmd/Ctrl-\` under the v1 shortcut toggle.

### 3.3 Audio & Video Playback

**Components.** Two Svelte components with a shared interface:
- `<AudioPlayer file callback>`
- `<VideoPlayer file callback>`

Same props/events (file source, playback event callbacks, seek APIs); tailored presentation (audio player is a compact bar; video player is a resizable region with the picture).

**Shared state.** A `PlayerContext` class carries the state that the editor and the player both need — current time, isPlaying, speed, playback boundary (from selection), etc. Both `<AudioPlayer>` / `<VideoPlayer>` and the ProseMirror editor plugins subscribe to it.

**Supported formats.** Everything the browser plays: mp3, wav, ogg, m4a, flac, webm audio, mp4 video, webm video, mov (browser-dependent).

**Controls.**
- Play/pause
- Skip back/forward configurable (default 1.5 s)
- Speed up/down in 0.125 steps
- Speed range 0.5×–2.5× (extended from v1's 0.5×–2×)
- Progress bar with click-to-seek
- Timestamp chip click-to-seek from the editor

Under the v1 shortcut toggle: Esc (play/pause), F1/F2 (skip back/forward), F3/F4 (speed down/up). v2 defaults will differ — final v2 keymap TBD during Phase 1.

### 3.4 Video File Transcription (replaces v1's YouTube support)

Users load a video file (mp4/webm/mov). Audio is extracted client-side and fed to the Whisper worker; the video plays back normally in `<VideoPlayer>`.

**Audio extraction.** FFmpeg.wasm, lazy-loaded on first use of a video file (same pattern as the tiny model). FFmpeg.wasm is heavy (~30 MB) but robust across container/codec combinations, which matters for the messy real-world files journalists have.

**YouTube is out of scope for v2.** Many free YouTube-transcription services exist; downloading YouTube video files is legally questionable and technically fragile. If a user has a YouTube video they want transcribed, they can obtain the file however they're comfortable (e.g., yt-dlp on their own machine) and load it into oTranscribe as a normal video file.

### 3.5 Local Storage & Session Management

**IndexedDB via [Dexie](https://dexie.org/).** Stores:
- `sessions` — `{ id (UUID), title, createdAt, updatedAt, mediaMeta, docJson, thumbnailDataUrl?, syncStatus }` — `syncStatus` is always `"local-only"` in MVP but reserved for future cloud sync.
- `mediaBlobs` — raw file bytes keyed by session id.
- `models` — cached Whisper models (OPFS in practice, but referenced from the session store).

**Session-store abstraction.** All UI components access sessions through a `SessionStore` interface, not raw Dexie calls. This is the seam that a future cloud-sync implementation replaces or wraps. Zero cloud code ships in MVP; the abstraction is what preserves the option.

**Autosave.** Every editor transaction schedules a debounced save (~500 ms after last change). Playback state persists on pause/seek/session-close, not every tick.

**Autosave status.** A dedicated Svelte component reads current save state (`saving | saved | error`) and exposes it in the transcript editor view (contextual, not global — it's meaningless outside the editor).

**Backwards compatibility.** v1 stores everything in `localStorage`. On first launch of v2, detected v1 keys are migrated into IndexedDB sessions, preserving text and media metadata. Old `.otr` files import cleanly.

### 3.6 Import / Export

**Import.**
- Audio files (drag-drop or picker).
- Video files (drag-drop or picker) — see §3.4 for extraction.
- `.otr` files (v1 or v2 JSON format).
- Markdown files → creates an editor-only session with no audio. (Note: Markdown *editing* is roadmap; Markdown *import as plain text* is trivial and included.)

**Export.**
- **Plain text (.txt)** — with or without timestamps (user choice).
- **`.otr` (JSON)** — v2 superset of v1 format. v1-format export remains available for interop.
- **WebVTT (.vtt)** and **SRT (.srt)** — derived from `whisper` mark ranges. Useful for video subtitling.
- **Markdown (.md)** — timestamps rendered as `[HH:MM:SS]` inline. Even though MVP doesn't *edit* Markdown, we export to it because it's the lowest-friction format for downstream tools.
- **Copy-to-clipboard** — same formats, no download.

### 3.7 Internationalization

Preserve the 26 languages oTranscribe already supports. Migrate strings from webl10n INI files into a Svelte-friendly format ([svelte-i18n](https://github.com/kaisermann/svelte-i18n) with JSON message files).

**Migration is done via testable translation scripts** (INI ↔ JSON), not by hand-writing or AI-generating the JSON files. This mitigates hallucination risk and gives us a reversible transform in case something breaks. The scripts are unit-tested against fixture files.

Native-speaker translators are only needed for *new* UI copy introduced by v2 features (model selection, transcription progress, confidence flagging, etc.).

### 3.8 Accessibility

- All controls reachable by keyboard.
- Proper ARIA labels for player controls, editor toolbar, model-selection UI.
- Color contrast checked against WCAG AA.
- Screen-reader-friendly announcements for transcription progress ("Segment 12 of 40 complete").
- Editor is a ProseMirror instance; ProseMirror ships reasonable a11y defaults, but we verify with VoiceOver + NVDA.
- **Accessibility is enforced by Playwright** from the start — `@axe-core/playwright` in end-to-end tests catches regressions. Not an afterthought.

---

## 4. Non-Functional Requirements

- **Performance targets.**
  - Cold start (no models cached) to interactive: ≤ 3 s on a 2020 MacBook Air.
  - `tiny.en` model available (fully cached, ready to run) within ≤ 10 s of the page finishing initial load, on a warm connection.
  - Playback controls respond in < 50 ms regardless of transcription state.
  - Editor stays responsive (60 fps typing) on documents up to a 3-hour interview (~30k words).

- **Browser support.** Latest 2 versions of Chrome, Firefox, Safari, Edge. WebGPU is progressive — the app must work on WASM-only browsers, just more slowly.

- **Bundle size.** JS bundle (excluding models, excluding FFmpeg.wasm) ≤ 500 KB gzipped for initial page load. Whisper WASM runtime is loaded lazily when transcription is first invoked. FFmpeg.wasm is loaded lazily when a video file is first imported.

- **Deployability.** Static output. Deployable to any static host (Netlify, Cloudflare Pages, S3+CloudFront, or a plain nginx). Self-hostable by copying `/build` to any web server, mirroring v1's ethos.

- **Privacy.**
  - **Zero telemetry in MVP.** No analytics of any kind ship in v2.0 — no Plausible, no custom events, no third-party services that observe usage. Analytics posture is deferred as a post-MVP decision (see §8).
  - No requests to third-party services during transcription or editing.
  - Model downloads go to MuckRock-controlled CDN.
  - A strict `Content-Security-Policy` locks down `connect-src` to only what's needed.
  - Any future opt-in cloud persistence will be behind an explicit user action; nothing implicit.

- **Licensing.** MIT (unchanged). All new dependencies audited for license compatibility.

---

## 5. Technical Architecture

### 5.1 Stack

- **Language:** TypeScript (strict). All new code fully typed — this includes the transcribe.js integration and any future custom wrapper.
- **App framework:** SvelteKit (Svelte 5 runes).
- **Editor:** ProseMirror (`prosemirror-state`, `prosemirror-view`, `prosemirror-model`, `prosemirror-history`, `prosemirror-keymap`; additional packages come with the Markdown editing roadmap milestone).
- **ASR:** whisper.cpp WASM, wrapped by transcribe.js.
- **Audio extraction from video:** FFmpeg.wasm.
- **Storage:** IndexedDB via Dexie; OPFS for model files.
- **Styling:** SvelteKit CSS with a light design-token layer. Retain the existing visual identity (typography, color palette) — v2 is a rebuild, not a rebrand. (Rebranding is roadmap; §9.)
- **Testing:** Vitest for unit tests; Playwright for end-to-end and accessibility.
- **Build/deploy:** SvelteKit static adapter → hosted on the same static infrastructure as today.

### 5.2 Service-oriented runtime

Long-running or heavy work runs in dedicated background contexts, not on the UI thread. The main thread orchestrates and renders.

```
+-------------------------------------------------------------+
| SvelteKit main thread                                       |
|                                                             |
|   +-------------+  +-----------+  +---------------------+   |
|   | Player      |  | ProseMirr |  | Library / sidebar   |   |
|   | (Audio or   |  | -or       |  |                     |   |
|   |  Video)     |  | editor    |  |                     |   |
|   +-----+-------+  +-----+-----+  +----------+----------+   |
|         \                |                   |              |
|          \    PlayerContext + Svelte stores  |              |
|           +------- (playback, transcription  |              |
|                     progress, session) ------+              |
|                                 |                           |
+---------------------------------|---------------------------+
                                  |
              +-------------------+---------+---------------+
              |                             |               |
              v                             v               v
   +---------------------+     +---------------------+   +---------------+
   | Whisper Web Worker  |     | FFmpeg Web Worker   |   | Service       |
   | (whisper.cpp WASM + |     | (video→audio        |   | Worker        |
   |  transcribe.js)     |     |  extraction)        |   | (app shell,   |
   +---------------------+     +---------------------+   |  model cache, |
                                                         |  offline)     |
                                                         +---------------+
```

- **Web Workers** for CPU-bound background work (transcription, audio extraction).
- **Service Worker** for network interception, offline app shell, and model-file caching in OPFS.
- **PlayerContext** and Svelte stores broker state between the player, the editor plugins, and any UI showing transcription/save/model progress.
- All persistence goes through a `SessionStore` abstraction (§3.5).

### 5.3 Directory layout (proposed)

```
oTranscribe/
├── src/
│   ├── routes/                    # SvelteKit pages (library, editor)
│   ├── lib/
│   │   ├── player/                # AudioPlayer, VideoPlayer, PlayerContext
│   │   ├── editor/                # ProseMirror schema, plugins, commands
│   │   ├── transcribe/            # worker glue, transcribe.js integration
│   │   ├── extract/               # FFmpeg.wasm audio extraction
│   │   ├── storage/               # SessionStore abstraction, Dexie schema
│   │   ├── import-export/         # OTR, MD, VTT, SRT, TXT
│   │   ├── i18n/                  # message catalogs + INI↔JSON scripts
│   │   ├── autosave/              # autosave status component + logic
│   │   └── ui/                    # shared Svelte components
│   ├── workers/
│   │   ├── whisper.worker.ts
│   │   └── ffmpeg.worker.ts
│   ├── service-worker.ts
│   └── app.html
├── static/
├── tests/
├── e2e/
├── scripts/
│   └── i18n/                      # INI↔JSON translation scripts + fixtures
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── SPEC.md
├── PLAN.md
└── README.md
```

The v1 codebase moves to a `legacy/` branch and remains buildable for the transition period.

---

## 6. Data Formats

### 6.1 `.otr` v2 (superset of v1)

```json
{
  "otrVersion": 2,
  "sessionId": "uuid-v4",
  "text": "…HTML string, v1-compatible…",
  "textDoc": { "type": "doc", "content": [ /* ProseMirror JSON */ ] },
  "media-time": 0,
  "media-name": "interview.mp3",
  "media-source": "",
  "language": "en",
  "whisperRanges": true,
  "syncMeta": null
}
```

- `sessionId`: stable UUID, preserved across export/import — future cloud sync depends on this.
- `whisperRanges`: `true` when `textDoc` contains `whisper` marks with `{start, end, confidence}`.
- `syncMeta`: reserved for future cloud-sync metadata; always `null` in MVP.
- `otrVersion: 1` files import cleanly by parsing `text` as HTML and running the v1→v2 timestamp lifter.
- v2 always writes both `text` and `textDoc` so v1-era tools can still consume the file.

### 6.2 WebVTT / SRT

Standard formats, derived from `whisper` mark ranges. Cue boundaries follow segment boundaries by default; user can regenerate cues from current sentence breaks.

---

## 7. Security & Privacy Considerations

- **Model provenance.** Ship checksums for every downloadable model. Verify before caching.
- **CSP.** Strict CSP disallowing inline scripts and unrelated origins.
- **No opaque redirects.** Any external navigation is explicit and labeled.
- **Cross-origin isolation.** WASM threads require `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` headers. **These are on** (Vite plugin sets them for dev/preview; `static/_headers` sets them for Netlify/Cloudflare Pages). `crossOriginIsolated === true` is verified by e2e. MuckRock OAuth compatibility was analyzed during the Phase 3 spike (see §7.1): the standard authorization-code flow uses top-level navigations only, which are unaffected by COOP/COEP, so isolation and OAuth coexist. Popup-based sign-in would need `COOP: same-origin-allow-popups`, which forfeits SharedArrayBuffer — we avoid that path.
- **Model CDN.** MuckRock-hosted, so we control availability and can pin versions/checksums. Direct-from-Hugging-Face is deferred to the BYO-model roadmap item.
- **Storage boundaries.** Nothing outside the app's IndexedDB / OPFS is touched. No File System Access API writes outside user-chosen scope.
- **Future cloud persistence.** When opt-in cloud sync ships (§9), all data at rest and in transit will be encrypted, and the client will be verifiable — the SPEC for that phase will detail the threat model.

### 7.1 MuckRock OAuth × cross-origin isolation (spike findings, 2026-08-06)

MuckRock Accounts implements standard OAuth 2.0 / OIDC authorization-code with a **confidential client** (`accounts.muckrock.com/openid/authorize`, `/token`, `/userinfo`, webhook to client backend). The flow anatomy:

1. **Authorize** — top-level browser navigation from oTranscribe → `accounts.muckrock.com`. Not restricted by COOP or COEP.
2. **Callback** — top-level redirect back with `?code=…`. Not restricted.
3. **Token exchange** — server-side POST with `CLIENT_SECRET`. Not a browser concern.
4. **UserInfo** — server-side `GET` with `Bearer`. Not a browser concern.
5. **Webhook** — MuckRock → client backend (cache-invalidation notification). Server-to-server.

**Compatibility verdict.** The flow is fully compatible with `COOP: same-origin` + `COEP: require-corp`. No `postMessage` between windows, no cross-origin subresources on the oTranscribe origin. Isolation and OAuth coexist.

**Architectural constraint uncovered.** The flow **requires a backend on the oTranscribe side** to hold `CLIENT_SECRET`, perform token exchange, and receive the webhook. oTranscribe v2.0 is a static SvelteKit deploy with no backend (§5.1). Two paths for the v2.1 "Persistence and identity" cluster (§9):

- **Add a thin backend** (Cloudflare Worker, Netlify Function, or a dedicated MuckRock-hosted service) that owns the OAuth handshake and cloud-sync API. The static app calls it. Non-signed-in users continue to use the tool with no backend involvement.
- **Negotiate a public-client PKCE flow** with the MuckRock Accounts team so the browser can complete the flow without a secret. This is a policy change on MuckRock's side; not a v2.1 dependency oTranscribe controls unilaterally.

**Decision:** proceed with isolation headers on now; defer the backend-vs-PKCE choice to the v2.1 SPEC. Nothing in v2.0 depends on either.

**MVP ships with zero telemetry.** No Plausible, no custom event counters, no user-identifying data. Whether to add coarse aggregate analytics post-MVP is deferred as an analytics-posture decision.

For MVP, we lean entirely on qualitative and internal signals:

- **Community feedback.** GitHub issues, MuckRock support inbox, mentions in journalism-tools newsletters.
- **Beta dogfood.** MuckRock reporters using v2 for real stories during the beta window (PLAN Phase 7).
- **Time-to-first-transcript.** Measured internally with our own recordings: how long from "load file" to "usable transcript" on the recommended model? Target: < 0.5× realtime on `small` on a 2020 MBA.

---

## 9. Roadmap (Post v2.0)

The **Persistence and identity** cluster is locked as the **v2.1 focus** — it addresses the biggest v1 pain point (users losing transcripts). Everything else below is roughly ordered by product-identity impact, not implementation order.

**Persistence and identity — v2.1 focus**
- **Opt-in MuckRock account sign-in.** Enables cloud transcript backup and cross-device access. Never a requirement. Requires a backend for the OAuth token exchange (see §7.1) — v2.1 SPEC will settle whether that's a small Cloudflare Worker / Netlify Function or lives inside MuckRock's own infrastructure.
- **Cloud transcript storage and backups.** Reliable persistence beyond the browser cache. Server never sees plaintext without user consent.

**Editor enhancements**
- **Markdown editing.** Formatting marks (bold, italic, code, link), block types (headings, quotes, lists, code blocks), Markdown input rules, and Markdown copy/paste. This is the largest single deferred feature and comes soon after MVP.
- **Word-level and node-level timestamp editing.** UI for nudging a word's start/end.
- **More granular mapping of words to timestimps.** Whisper generates segments of text with timestamps every ~5 seconds. Within that 5 second block of timestamp-bounded text, can we map each text position to a time in the audio track?
- **Low priority: Descript-style edit-audio-by-editing-text.** Deleting a word in the transcript deletes the audio range on export. Requires a stable client-side audio-mixdown pipeline.

**UI enhancements**


**ASR features**
- **Language auto-detection.** Whisper supports it; UI adds an "auto" option.
- **Speaker diarization.** whisper.cpp doesn't do this natively; consider pyannote-onnx or a similar WASM-friendly diarizer.
- **Live / microphone transcription.** Real-time streaming ASR from mic input for meetings/lectures.
- **Bring-your-own model.** Drag-drop `.bin` files or direct Hugging Face URLs.

**Library and search**
- **Project grouping.** Organize transcripts by story/case.
- **Search across all transcripts.** Full-text search over the local library.
- **Named-entity highlighting.** Local NER model to auto-tag people/places for journalist workflows.

**Other**
- **Multi-track / merged transcripts** for group interviews.
- **Encrypted transcript export.** For sensitive sources.
- **Rebrand.** Visual refresh so users can tell v2 apart from v1.

---

## 10. Open Questions

Most §10 questions from the first draft are now resolved (see §§1, 3.1, 3.4, 5.1). What remains:

1. ~~**COOP/COEP compatibility with MuckRock OAuth.**~~ **Resolved during Phase 3 prereq spike (2026-08-06):** the flow is unaffected by isolation headers (see §7.1 for details). Isolation is on. A separate architectural finding — the flow requires a backend to hold `CLIENT_SECRET` — is captured in §7.1 and §9 as a v2.1 SPEC dependency, not a v2.0 blocker.
2. ~~**v2 default keymap.**~~ **Resolved during Phase 1 (2026-08-05):** v2 default = Ctrl/Cmd-`'` (play/pause), Ctrl/Cmd-`,` / Ctrl/Cmd-`.` (skip back/forward), Ctrl/Cmd-Shift-`,` / Ctrl/Cmd-Shift-`.` (slower/faster), Ctrl/Cmd-`;` (insert timestamp). v1 keymap (Esc, F1–F4, Cmd/Ctrl-\`) is preserved as an opt-in toggle. Both revisitable during Phase 4 once the interaction model is finalized.
3. **Low-confidence threshold.** What Whisper confidence level triggers the wavy-underline visualization? Almost certainly configurable, but what's the default? Empirical — decide during Phase 3 spike.
4. **Autosave debounce for time-stamping typed text.** How long a pause counts as "end of a written phrase" when applying the auto-whisper-mark during playback? Starting proposal: 400 ms. Tunable during Phase 4 (playback↔editor integration).

---

*Second draft, incorporating Allan's 2026-08-05 feedback. Expect §3.2 (editor interaction model), §5 (service-oriented layout), and §9 (roadmap) to see further iteration as we build.*

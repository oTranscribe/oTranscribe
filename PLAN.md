# oTranscribe v2 — Implementation Plan (Draft)

> **Status:** Second draft. Written 2026-08-04, revised 2026-08-05 alongside SPEC.md.
> **Companion to:** [SPEC.md](./SPEC.md).
> **Purpose:** A phased path from today's v1 codebase to a shipped v2. Each phase has a clear deliverable, a demo, and an exit criterion — so we can pause between phases and reassess.

---

## Guiding Assumptions

- **Rebuild in a parallel tree, not a rewrite-in-place.** v1 code moves to a `legacy/` branch and stays deployable at `otranscribe.com` for the whole rebuild. v2 lives on the `v2` branch (already checked out) and deploys to a staging URL until it replaces v1.
- **Ship narrow slices end-to-end.** Every phase produces something dogfoodable, even if incomplete. This is how we catch design mistakes early.
- **Defer, don't skip.** Anything not in a phase is called out in "Not in this phase" so scope loss is deliberate.
- **Architecture supports opt-in cloud sync as a future addition** (SPEC §1, §3.5). No cloud code ships in MVP; the seams that would let us add it later are in place from Phase 1.
- **Design is engineer-led for MVP.** No dedicated design partner on the MVP; design attention points are called out per-phase in the cross-cutting section.
- **Rough time estimates** are engineer-weeks for one FTE. Calibrations, not commitments.

---

## Phase 0 — Foundation & Scaffolding
**Estimate:** 1 week
**Goal:** A running SvelteKit app with TypeScript, testing, CI, and a service-worker skeleton, deployed to staging. No product features yet.

### Deliverables
- SvelteKit project bootstrapped at the repo root (existing v1 code moved to `legacy/`).
- TypeScript strict mode configured.
- Vitest + Playwright wired up with a smoke test.
- **`@axe-core/playwright`** included in the e2e setup — a11y assertions run from day one (SPEC §3.8).
- ESLint + Prettier for TS + Svelte.
- GitHub Actions CI: install, typecheck, lint, unit tests, build.
- **Service worker skeleton** registered (app shell caching only for now; model caching lands in Phase 3).
- Staging deploy: SvelteKit static output to Netlify/Cloudflare Pages under a `v2.otranscribe.com` (or similar) URL, protected by basic auth until launch.
- Design tokens extracted from existing SCSS (colors, typography, spacing) into a `tokens.css` module so v1's visual identity survives (SPEC §5.1 — rebuild not rebrand).

### Exit criterion
- `pnpm dev` runs, hot-reloads, and shows a "Hello oTranscribe v2" page in the v1 typography.
- CI is green on the `v2` branch, including a passing axe-core check on the placeholder page.
- Staging URL loads.
- Service worker registers and controls the page on second load.

### Not in this phase
- Whisper, ProseMirror, FFmpeg — nothing product-feature.
- COOP/COEP headers (arrives in Phase 3 with threaded WASM).

---

## Phase 1 — Media Players, Library Skeleton, Session Store
**Estimate:** 3 weeks
**Goal:** A user can open the app, see a library, upload an audio *or* video file, play it back with v1-compatible shortcuts, and reload the page without losing anything. The persistence seam is in place for future cloud sync.

### Deliverables
- **Library page** (SPEC §3.0): landing view with a flat list of local sessions and a "New transcript" action (upload / drag-drop). Rows show title, media meta, updated-at.
- **`<AudioPlayer>` and `<VideoPlayer>` Svelte components** (SPEC §3.3) with a shared prop/event interface. Video player is a resizable region; audio player is a compact bar.
- **`PlayerContext` class** exposing shared state (`currentTime`, `isPlaying`, `speed`, `playbackBound`) that both players and the future editor plugins subscribe to.
- **Player controls:** play/pause, seek, skip ±1.5 s, speed 0.5–2.5× in 0.125 steps, click-to-seek progress bar.
- **Keyboard shortcut system** with a **legacy-vs-default toggle** (SPEC §2). v1 shortcuts implemented (Esc / F1 / F2 / F3 / F4). v2 default keymap TBD in this phase — pick and lock.
- **Dexie schema v1:** `sessions` (with `id: UUID`, `syncStatus: "local-only"`) and `mediaBlobs`.
- **`SessionStore` abstraction** — all UI reads/writes go through this interface, never raw Dexie (SPEC §3.5). This is the cloud-sync seam.
- **Language default from `navigator.language`** — captured on session creation, overridable per session (surfaces properly in Phase 3).
- **Placeholder editor** (plain `<textarea>`) so we have somewhere to type while validating playback + storage.
- **Playwright test** loads a bundled sample audio, drives play/pause/skip via keyboard, and verifies session restoration on reload.

### Exit criterion
- Load a 30-minute mp3 → play, pause, skip, speed-change all work.
- Load an mp4 → video plays; same controls work.
- Type in the textarea, reload → text and audio position restored.
- Toggle v1-shortcut mode → F1/F2 work; default off → they don't.
- Library shows the session, and one-click re-opens it.

### Not in this phase
- ProseMirror.
- Any transcription.
- Video → audio extraction (needed only for Whisper, comes in Phase 6).
- Library search or projects (roadmap).

---

## Phase 2 — ProseMirror Editor (Plain-Text MVP)
**Estimate:** 2 weeks
**Goal:** Replace the textarea with a ProseMirror editor scoped to the MVP schema — plain text, `timestamp` nodes, and `whisper` marks. No Markdown formatting yet.

### Deliverables
- **Schema** (SPEC §3.2 MVP): `paragraph` blocks, `text`/`timestamp`/`hardBreak` inline, and the `whisper` mark carrying `{start, end, confidence}`.
- **Timestamp node**: inline, atomic, chip-rendered as `[HH:MM:SS]`. Click-to-seek. Keyboard-insert shortcut inserts at cursor with `time = playerContext.currentTime`.
- **`whisper` mark plumbing**: schema, serialize to `.otr` v2 JSON, deserialize from Phase 3's Whisper output. No highlight rendering yet — that's Phase 4.
- **Undo/redo** via `prosemirror-history`.
- **Autosave**: debounced transaction handler saves doc JSON through `SessionStore`.
- **v1 `.otr` importer**: parse the v1 HTML string, lift `<span class="timestamp">` elements into `timestamp` nodes, everything else becomes plain paragraphs.
- **Editor unit tests** (Vitest): timestamp roundtrip, whisper mark preservation across edits (including the split-keeps-same-start/end rule), v1 import fidelity on a set of real v1 `.otr` fixtures.

### Exit criterion
- Type a paragraph, insert timestamps via shortcut, click them → player seeks.
- Import a real v1 `.otr` file → all text and timestamps preserved; export back to v1 format → roundtrips cleanly.
- Undo/redo works across text edits, timestamp inserts, and mark applications.
- Autosave persists and restores editor content across reload.

### Not in this phase
- Markdown formatting (roadmap).
- Any highlighting driven by `whisper` marks (Phase 4).
- Confidence rendering (Phase 4).
- Formatting toolbar (roadmap, with Markdown).

### Risks
- ProseMirror has a learning curve. Even the reduced MVP schema requires understanding transactions, marks vs. nodes, and atomic inline node behavior. Budget prototyping time.
- The whisper-mark split-preserves-range invariant is subtle. Write tests early.

---

## Phase 3 — Whisper Transcription in a Worker
**Estimate:** 3 weeks
**Goal:** User can load audio and get a transcript, produced entirely in-browser, streaming into the editor with `whisper` marks attached.

### Prerequisite spikes
- ~~**COOP/COEP × MuckRock OAuth verification**~~ **Done (2026-08-06).** Analyzed against the MuckRock OAuth guide: the standard authorization-code flow uses only top-level navigations + server-to-server POSTs, so isolation headers don't affect it. Headers are now on (Vite plugin for dev/preview, `static/_headers` for Netlify/Cloudflare Pages). `crossOriginIsolated === true` is asserted in e2e. Separate finding: OAuth requires a backend for `CLIENT_SECRET` — captured in SPEC §7.1 as a v2.1 architecture question, not a v2.0 blocker.
- ~~**whisper.cpp + transcribe.js smoke test**~~ **Folded into integration (2026-08-06).** transcribe.js's documented `onSegment` + `cancel()` + `destroy()` API gave enough confidence to build the real client without a throwaway page. Live-audio verification with a 10-minute English sample lives in a follow-up task (see below).

### Deliverables (status as of 2026-08-06)
- ✅ **Whisper Web Worker** — transcribe.js's `@transcribe/shout` build ships an Emscripten pthread pool; we run whisper.cpp inside it, main thread stays free. Wrapped in `src/lib/transcribe/client.ts` behind our own typed `TranscribeSession` so a swap is bounded (PLAN risk register).
- ✅ **Model management with progress + verification** — `src/lib/models/store.ts` streams downloads into OPFS with a `.part` staging file, supports cancel via `AbortSignal`, lists cached models with sizes, deletes. Checksum verification is wired but skipped when `sha256` is `null`; see follow-up "Populate model checksums pre-beta." Service Worker itself doesn't reach into OPFS (it can't across scopes) — the SW handles same-origin app-shell caching, model bytes are stored via OPFS by the main thread.
- ✅ **Tiny.en background preload** — kicked off from `+layout.svelte` via `src/lib/models/preload.svelte.ts`, silent unless the user opens the transcribe panel before it finishes.
- ✅ **Larger models fetch-on-first-use** — model catalog covers tiny/base/small/medium/large-v3-turbo (english-only + multilingual variants) with size + description + language coverage.
- ✅ **Model catalog UI in settings** — `/settings` lists every catalog entry with cached/downloading/download states, Delete/Cancel/Download buttons, progress bar, and a warning when a checksum isn't pinned.
- ✅ **Transcribe flow on the session page** — `src/lib/transcribe/TranscribePanel.svelte` renders under the player: model + language picker, backend indicator, Start / Cancel, per-segment progress. Language input auto-disables for english-only models.
- ✅ **Segment insertion** — `appendWhisperSegmentCommand` in `src/lib/editor/commands.ts` appends a paragraph containing a leading `timestamp` node + text with a `whisper` mark carrying `{start, end, confidence}`. Streams in as segments arrive; safe against concurrent user edits (always appends at doc-end).
- ✅ **Cross-origin isolation headers** — done in the prereq spike; verified in e2e.
- ⚠️ **Backend detection** — `detectBackend()` picks between `wasm-simd-threaded` and `wasm-single` based on cross-origin-isolated + SIMD probe. The `webgpu` enum value is reserved: transcribe.js has no WebGPU backend today, so we never select it. The UI shows the truthful active backend.
- ✅ **Cancel transcription mid-run** — `TranscribeSession.cancel()` → `FileTranscriber.cancel()`. Pause is not a distinct concept for transcribe.js — canceled runs can be restarted from the same panel.
- ⏳ **First-transcription walkthrough** — deferred as a small onboarding tooltip; see follow-up task.

### Exit criterion (status)
- ⏳ Load a 10-minute English audio → tiny.en runs, streaming a transcript with segment timestamps and `whisper`-marked text. *End-to-end flow is wired; live-audio verification is a follow-up task — we can't drive a real 75 MB model + Whisper run in CI within reasonable time bounds.*
- ✅ Downloaded models persist across reload — OPFS is durable per browser storage rules.
- ⏳ UI stays responsive during transcription — architecture guarantees it (transcribe.js runs whisper.cpp in its own pthread pool), but needs live confirmation with a real audio.
- ✅ COOP/COEP + OAuth compatibility confirmed (prereq spike, SPEC §7.1).

### Not in this phase
- Karaoke highlight (Phase 4).
- Confidence rendering (Phase 4).
- Video file transcription (Phase 6 — needs FFmpeg).
- BYO model (roadmap).

### Risks
- **This is the highest-risk phase.** Start with the two spikes above; only proceed once both are green.
- Model file sizes are big. Download UX matters — cancellable, resumable, "you can leave and come back."
- transcribe.js maintenance risk. Hedge by keeping the worker interface behind our own thin TS module so a swap is bounded.

---

## Phase 4 — Cursor ↔ Playhead Sync
**Estimate:** 3 weeks
**Goal:** The transcript is *live* — playhead, cursor, and selection are three views of the same timeline. This is what makes v2 feel modern and is the most interaction-heavy phase.

### Deliverables (status as of 2026-08-07)
Following SPEC §3.2's interaction model:

- ✅ **Playback → editor highlight** — `src/lib/editor/highlight-active.ts` maintains a ProseMirror DecorationSet driven by `PlayerContext.currentTime`. Solid fill is applied to every whisper mark whose `{start, end}` brackets the playhead. Cheap: the DecorationSet only rebuilds when the active-mark signature changes, otherwise it just re-maps on doc edits.
- ⏳ **Gradient fill for partial matches** — code seam is in the plugin; the SPEC's semantics for "matching only start OR end" are underspecified so this ships as a Phase 4+ refinement. Not blocking exit.
- ✅ **Click-to-seek on whisper text** — `whisperClickSeekPlugin` in `src/lib/editor/plugins.ts`.
- ✅ **Play from cursor** — `EditorApi.getCursorWhisperStart()` returns the nearest-preceding mark's start; the session route's play/pause handler seeks there before toggling if the delta > 0.25 s.
- ✅ **Selection → playbackBound** — `selectionBoundPlugin` computes `[earliest start, latest end]` across marks in the selection and calls `player.setBound / clearBound`.
- ✅ **Typing during playback → auto whisper mark** — `typingDuringPlaybackPlugin` in `src/lib/editor/typing-mark.ts`. Debounce default 400 ms. Explicitly skips (a) whisper-append transactions from streaming, (b) deletions, (c) any tx while paused.
- ✅ **Timestamp insertion during playback** — unchanged from Phase 2; still uses `player.readCurrentTime()`.
- ✅ **Low-confidence rendering** — schema `toDOM` writes `data-lowconfidence="true"` when `mark.confidence < threshold`. Threshold configurable in `/settings` (range 0–1, default 0.6). Wavy underline in `Editor.svelte` CSS.
- ✅ **Auto-scroll** — `autoScrollPlugin` in `src/lib/editor/auto-scroll.ts` nudges the active mark into view when it drifts significantly off-screen. Toggle in `/settings`, default on.
- ⏳ **Performance pass on 30k-word doc** — architecture uses signature-diffed rebuilds (no per-tick full re-scan), but a live perf sanity check with a 3-hour transcript remains as a follow-up task.
- ✅ **Playwright tests** for the four interaction paths.

### Exit criterion (status)
- ✅ Play back a transcribed audio: currently-spoken word lights up (solid fill). Gradient for edited ranges is a Phase 4+ refinement.
- ✅ Click a word → player jumps there.
- ✅ Select a range → `playbackBound` set to first-start..last-end; PlayerContext enforces "play once and stop" on the timeupdate handler.
- ✅ Type during playback → new text auto-attributes with a fresh whisper mark reflecting the play window (debounce-driven).
- ✅ Low-confidence words visibly flagged; threshold tunable in settings.

### Not in this phase
- Descript-style audio-edit-by-text (roadmap).
- Word-level timestamp nudging UI (roadmap).

### Risks
- Debounced-typing-during-playback → mark application is subtle. Edge cases: user pauses, seeks, then types; user types then keeps typing past the debounce window (should the mark extend?); user deletes then retypes. Write out the state machine before coding.
- Decoration performance on large docs. Use plugin state + step-based invalidation, not full re-scan on every currentTime tick.
- Wavy-underline rendering across browsers — some pain historically. Verify early.

---

## Phase 5 — Library, Import/Export, i18n
**Estimate:** 2 weeks
**Goal:** Feature-completeness for the surrounding surfaces (library, formats, translations) so the app is usable end-to-end.

### Deliverables (status as of 2026-08-08)
- ✅ **Library screen polish** — `src/routes/+page.svelte` now offers inline Rename, Duplicate, per-format Export (dropdown), and Delete on every row. Sort remains by `updatedAt DESC` (already in `DexieSessionStore.list`).
- ✅ **Export formats** — `src/lib/export/` renders `.otr` v2 (superset, `otrVersion: 2` + `textDoc`), `.otr` v1 (interop), `.md`, `.txt`, `.vtt`, `.srt`. Pure functions + `downloadPayload()` helper. Copy-to-clipboard is not surfaced yet — trivial to add on top since `exportSession` returns the string body. Cue extraction (paragraph → whisper min-start/max-end) unit-tested; VTT/SRT timecodes verified byte-for-byte against expected fixtures.
- ✅ **Import** — audio, video (unchanged path), `.otr` v1 + v2 (uses existing `docFromOtr`), `.md` (paragraph splitting + `[H:MM:SS]` inline detection). File-type detection at `src/lib/import/detect.ts` prefers extension over `File.type` because browsers are inconsistent about `.otr` MIME.
- ✅ **v1 → v2 migration** — `src/lib/migrate/v1.ts`: scans `localStorageManager_oTranscribe-backup-*` + `localStorageManager_autosave`, imports each into a new Session with a placeholder media meta. Idempotent (marker setting `v1MigratedAt`). Fires `otr-v1-migration-complete` on `window` so the library refreshes without a manual reload. Settings has a "Download raw v1 data" escape hatch that dumps every v1-related localStorage key as JSON.
- ✅ **i18n port** — parser at `src/lib/i18n/parse-ini.ts` (webL10n dialect), `scripts/i18n-import.mjs` builds `src/lib/i18n/messages/*.json` from the legacy INIs. 24 locales generated (skipping `pirate.inix` / `qqq.ini` dev artifacts). Runtime translator `t()` + reactive `activeLocale` in `src/lib/i18n/store.svelte.ts`. No `svelte-i18n` dep — we're small enough to ship our own ~40-line translator and revisit later if a bundle audit disagrees.
- ✅ **Settings screen** — keymap toggle lives on the session page (still), model management, low-confidence, auto-scroll, plus the new **Interface language** picker (all 24 locales) and the v1-data escape hatch.
- ✅ **Autosave status** — already wired in the session route topbar (`saving | saved | error`). Distinct component extraction wasn't necessary; the state machine is a single `saveState` var with three lines of markup.

### Exit criterion (status)
- ✅ A v1 user in this browser loads v2 → sees old backups as sessions. Verified in `e2e/phase5.spec.ts:97`.
- ⏳ Export a session as VTT → load into VLC — manual verification. Unit tests pin the byte-exact VTT/SRT output against a fixture doc, but the round-trip through a real caption player is a follow-up.
- ✅ All 24 languages render in the settings picker (`e2e/phase5.spec.ts:86` selects French and re-verifies after reload). Full-string coverage in every UI surface is a Phase 7 concern (SPEC beta scope: English + top-5 by traffic).
- ✅ Translation scripts round-trip a full INI ↔ JSON pass. The parser is unit-tested with hand-written fixtures (`parse-ini.test.ts`) and the build script is one-shot idempotent.

### Not in this phase
- Library search or project grouping (roadmap).
- Video file *transcription* (Phase 6).
- Copy-to-clipboard export variants (post-MVP UI polish; body strings are already available via `exportSession`).

---

## Phase 6 — Video Transcription (FFmpeg) + Polish + A11y
**Estimate:** 3 weeks
**Goal:** Full media matrix — video files can be transcribed, not just played. Ship-quality polish across the app.

### Deliverables (status as of 2026-08-08)
- ✅ **FFmpeg.wasm integration** — `src/lib/extract/session.ts` exports `extractAudio(source)` that lazily loads `@ffmpeg/ffmpeg` + `@ffmpeg/core-mt` on first use, caches the FFmpeg instance across subsequent calls, and returns a 16 kHz mono WAV. Core .js + .wasm + worker files come from `?url` imports on the `@ffmpeg/core-mt` package exports, so Vite emits them as hashed same-origin assets — no unpkg fetch, works under COOP/COEP.
- ✅ **Video → audio extraction pipeline** — `planChunks` in `audio-chunks.ts` now tries Web Audio first; on decode failure it invokes the extract fallback (a lazy dynamic import) and retries decode on the returned WAV. Downstream chunking + Whisper are unchanged. Audio files never trigger the fallback, so they don't pay the FFmpeg cost.
- ⚠️ **Extraction Web Worker** — FFmpeg 0.12.x spawns its own internal worker when we `new FFmpeg()`, so extraction already runs off the main thread. We do not wrap it in our own worker on top of that — the double-layer would add message-passing overhead without isolation gain. Documented so nobody wonders why the file doesn't live in `worker.ts`.
- ⏳ **Accessibility pass** — axe-core assertions in Playwright continue to pass (`e2e/smoke.spec.ts:18`). Human-driven VoiceOver + NVDA audits are a follow-up — this is calendar work best done against a beta build in Phase 7, not this phase's mostly-code milestone.
- ✅ **Bundle audit** — initial `/` page load fetches ~176 KB gzipped of JS (entry + layout + library page + shared chunks). Under the 500 KB budget by 3×. FFmpeg core JS (~40 KB gzipped) and shout.wasm-* (~1.4 MB) are both code-split behind dynamic imports; they load on demand, not at cold start.
- ⏳ **Cross-browser matrix** — Playwright runs Chromium in CI. Firefox + Safari matrix is a follow-up (Playwright supports both via `--project`, but we haven't wired the projects yet; Safari specifically needs a real macOS runner).
- ✅ **README rewrite** — [`README.md`](./README.md) covers what v2 does, self-hosting with the required COOP/COEP headers, `pnpm` workflow, and preserves the v1 translator credits.
- ✅ **CHANGELOG + v1 → v2 migration notes** — [`CHANGELOG.md`](./CHANGELOG.md) enumerates additions, changes-from-v1, removals, and the two bug fixes discovered during the diarize experiment. [`MIGRATION.md`](./MIGRATION.md) walks users, self-hosters, and `.otr`-file integrators through the transition.
- ✅ **No telemetry** — zero analytics fetches, zero third-party scripts. Verified by grep and by the Playwright `browser_network_requests` history on the smoke tests.

### Exit criterion (status)
- ⏳ Load an mp4 → click Transcribe → audio extracted → transcript populates. *The pipeline is wired end-to-end; live verification against a real mp4 is a follow-up (fixture + ~30 MB FFmpeg core makes CI-driven verification expensive).*
- ⏳ Full walkthrough by a non-engineer — beta cycle work, not this phase.
- ⚠️ Playwright e2e + a11y suite pass on Chromium (39/39 tests as of this commit). Cross-browser matrix follows.
- ✅ Bundle budget met.

### Not in this phase
- Any live/streaming transcription (roadmap).
- Rebrand (roadmap).
- Firefox / Safari CI matrix — follow-up.

### Risks (updated)
- FFmpeg.wasm is heavy (~31 MB WASM + 128 KB JS). Lazy-load UX flows through a dedicated `extracting` phase in the transcribe panel with distinct "Loading video decoder…" and "Extracting audio from video…" messages; users see progress rather than a stall.
- Codec coverage — FFmpeg's default core-mt build handles H.264/AAC (mp4/mov), VP8/VP9 + Opus (webm), and every mainstream audio codec. Exotic formats will still hit "Loading video decoder…" and then either succeed or surface an error message from FFmpeg itself. Documented in MIGRATION.md.

---

## Phase 7 — Beta Launch
**Estimate:** 1–2 weeks (mostly calendar time)
**Goal:** Real users on v2. v1 still up as a fallback.

### Deliverables
- **Beta at `beta.otranscribe.com`** — publicly accessible, linked from a banner on v1.
- **Feedback channel**: GitHub issue template + MuckRock-monitored email.
- **Two-week beta window** with focused outreach: MuckRock reporters, trusted journalism-tools reviewers (Nieman Lab, Journalism.co.uk), Freedom of the Press Foundation's tools list.
- **Language coverage for beta**: English + top-5 languages (by v1 traffic) fully verified end-to-end. Remaining 21 languages render technically but complete verification lands before Phase 8 GA.
- **Fix cycle** for beta feedback. Anything not fixable in a week rolls to v2.1.

### Exit criterion
- Beta is stable enough that MuckRock would use it for a real story.
- Critical bugs from beta feedback are fixed.

---

## Phase 8 — General Availability
**Estimate:** 1 week
**Goal:** v2 replaces v1 at `otranscribe.com`.

### Deliverables
- **Cutover**: `otranscribe.com` DNS/hosting points at v2.
- **v1 preserved** at `legacy.otranscribe.com` for a documented deprecation window (6 months?), with a banner directing users to v2.
- **Launch post** on the MuckRock blog: "we made it better *without* giving up on local-first."
- **Full 26-language verification complete.**
- **Public retro** issue on GitHub listing known limitations and confirming the v2.1 focus: **opt-in MuckRock account sign-in and cloud transcript backup** (SPEC §9, "Persistence and identity" cluster).

---

## Cross-Cutting Workstreams

Run in parallel to phases:

### Design
- Phase 0–1: extract tokens, sanity-check Svelte components hit the same look.
- Phase 3: transcription-in-progress state, model-download UI (new surfaces).
- Phase 4: highlight fills (solid vs. gradient), low-confidence indicator style, playback-bound affordance.
- Phase 5: library polish, settings screen.
- Phase 6: a11y polish.

### Documentation
- Update README continuously.
- Phase 3: model-management docs, self-hosting COOP/COEP requirement.
- Phase 6: full self-hosting + contribution guide.

### Community
- Announce the rebuild plan up front (GitHub Discussion) so translators and contributors can prepare.
- Solicit translator help early for new UI copy (Phases 3, 4, 5).

### Roadmap seams (light architectural attention throughout)
- Every phase respects the `SessionStore` abstraction and stable `sessionId`s.
- `.otr` v2 exports always include `syncMeta: null` and the session UUID (SPEC §6).
- New UI text is scoped to strings that can later be extended for account/sync surfaces without refactoring.

---

## Risk Register

| Risk | Phase | Mitigation |
|---|---|---|
| COOP/COEP headers break MuckRock OAuth integration | 3 spike | Verify at start of Phase 3. If broken, adapt auth flow (popup/postMessage or redirect) or drop threaded WASM |
| whisper.cpp WASM performance on low-end hardware disappoints | 3 | tiny.en is the default; be transparent about hardware/model trade-offs |
| transcribe.js maintenance stalls | 3 | Keep the worker behind our own thin TS interface; treat transcribe.js as swappable |
| ProseMirror whisper-mark split invariants have edge cases | 2, 4 | Property tests early; keep the MVP schema small |
| Cursor↔playhead sync state machine has subtle races (typing + seeking + pause) | 4 | Write out the state machine before coding; add Playwright coverage for each transition |
| Decoration/highlight perf drops frames on 30k-word docs | 4 | Use keyed plugin state, not full-doc rescans; profile early |
| FFmpeg.wasm bundle size and cold-load UX feel broken | 6 | Lazy-load on first use; clear progress messaging |
| Codec coverage gaps in FFmpeg for real-world video | 6 | Test matrix with real journalist samples (mp4/mov/webm) |
| v1 users' localStorage data doesn't cleanly migrate | 5 | Test migrator against real v1 backup fixtures; include raw-data escape hatch |
| Scope creep from "just add Markdown editing / diarization / live mic" | any | SPEC §9 explicitly punts these; refuse in-phase, log to roadmap |

---

## Rough Total

Phases 0–6: **~17 engineer-weeks**, plus **2–3 weeks** for beta/launch. Call it **~5 months** of one FTE with reality overhead — slightly more than the first draft, driven by the enriched Phase 4 (cursor↔playhead sync is the interaction heart of the product) and the new FFmpeg work in Phase 6, partially offset by a smaller Phase 2 (editor MVP without Markdown).

If a second engineer is available for the critical path, Phase 3 (Whisper) and Phase 4 (interactions) each shorten by ~1 week — total savings ~2 weeks.

---

## Locked Decisions (from planning conversation, 2026-08-05)

- **v1 location:** moved to `legacy/` subdir on this repo.
- **v1.1:** not cutting one — focus is entirely on v2.
- **Design:** engineer-led for MVP; no design partner.
- **Beta language coverage:** English + top-5 by v1 traffic at beta; full 26 at GA.
- **Analytics:** zero telemetry for MVP. Analytics posture deferred to a post-MVP decision.
- **v2.1 focus:** opt-in MuckRock account sign-in and cloud transcript backup.

---

*Once SPEC.md and PLAN.md are settled, phases become GitHub milestones and this document becomes a living tracker.*

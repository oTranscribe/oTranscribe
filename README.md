# oTranscribe

**[oTranscribe](https://otranscribe.com/)** is a free, browser-based tool that takes the pain out of transcribing recorded interviews. Play back audio or video, type your transcript, insert timestamps you can click to jump back — all in the browser, all local. No uploads, no accounts.

This repository contains **v2**, a ground-up rebuild on Whisper (in-browser ML transcription), ProseMirror, and SvelteKit. The original v1 codebase is preserved under `legacy/` for the deprecation window.

Built by [Elliot Bentley](https://www.muckrock.com/news/archives/2018/aug/06/otranscribe-joining-muckrock-and-documentcloud/); maintained by the [MuckRock Foundation](https://www.muckrock.com/). If you use oTranscribe for journalism, consider [donating](https://www.muckrock.com/donate/).

---

## What v2 does that v1 didn't

- **In-browser transcription.** Whisper runs locally via WebAssembly. No audio ever leaves your machine, no API keys, no monthly bill. Whisper models are downloaded once and cached in the browser.
- **Cursor ↔ playhead sync.** Click a word — the player seeks there. Play — the current word lights up. Select a range — playback loops through just that range. Type while playing — new text auto-attaches to the audio timing.
- **Video files.** v1 played video but only transcribed audio. v2 extracts the audio track with FFmpeg.wasm when your browser's built-in decoder can't demux the container.
- **Session library.** Everything you've worked on, one click away. Rename, duplicate, export in six formats (`.otr` v1 & v2, Markdown, plain text, WebVTT, SubRip). Search and folders are on the roadmap.
- **Import your v1 work.** On first launch, v2 finds any v1 autosaves and backups in your browser storage and imports them into the library. See [MIGRATION.md](./MIGRATION.md).

Local-first is unchanged: your audio and transcripts still live only in your browser.

Design details and phased plan live in [`SPEC.md`](./SPEC.md) and [`PLAN.md`](./PLAN.md). Full changelog: [`CHANGELOG.md`](./CHANGELOG.md).

---

## Running v2 locally

Requirements: Node 22+, [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173. First transcription launches a background model download (~75 MB for tiny.en); larger models available in Settings.

### Tests

```bash
pnpm test        # unit tests (Vitest)
pnpm e2e         # end-to-end tests (Playwright + Chromium)
pnpm check       # svelte-check + TypeScript
pnpm lint        # ESLint + Prettier check
```

### Production build

```bash
pnpm build
```

Output lands in `build/`. It's a static site — deploy behind any HTTP server that can send the two headers below.

---

## Self-hosting

Everything runs client-side, so hosting is a matter of serving the static build over HTTPS with two response headers on every request:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These headers enable `SharedArrayBuffer`, which whisper.cpp's threaded WASM build and the FFmpeg extraction path both require. `static/_headers` in this repo is preconfigured for Netlify and Cloudflare Pages; adapt for your host.

Once served, the `/settings` page lets each user download the Whisper model of their choice into OPFS. Nothing is cached server-side; every user's models and transcripts stay in their browser.

---

## Contributing

- **Bugs and feature ideas:** open a GitHub issue.
- **Code:** PRs welcome. Read `SPEC.md` and `PLAN.md` before large changes — v2 is still on a defined path to GA, and out-of-scope work will be redirected to `SPEC.md §9` (Roadmap).
- **Translations:** UI strings live in `src/lib/i18n/messages/*.json`, regenerated from `legacy/src/l10n/*.ini` via `scripts/i18n-import.mjs`. Existing translations by the volunteers below carry over automatically; new locales are welcomed.

### Translators (from v1)

Catalan: [Joan Montané](http://www.softcatala.org/wiki/Usuari:Jmontane), [Jon Sindreu](https://twitter.com/jonsindreu) · Chinese: baiqj, Cindy Ng, [Andy Pan](https://github.com/andy0130tw), [Cp0204](https://github.com/Cp0204), [Robin Kwong](https://github.com/RobinKwong) · Danish: [Christian Bruun](http://christianb.dk) · Dutch: [Patrick Mackaaij](http://www.eenmanierom.nl), Marjolein Quist · Filipino: [Patricia Albano](https://www.linkedin.com/in/patriciaclaudiaalbano) · French: [Olivier Aubert](http://www.olivieraubert.net), [@goofy-bz](https://github.com/goofy-bz), [Dr J Rogel-Salazar](http://quantumtunnel.wordpress.com) · German: [Dr J Rogel-Salazar](http://quantumtunnel.wordpress.com), Lisa Bernhardt · Greek: [Konstantinos Alexiou](http://konalexiou.net) · Indonesian: [Joy Tikoalu](mailto:joy.tikoalu@gmail.com) · Italian: [Dr J Rogel-Salazar](http://quantumtunnel.wordpress.com), [Edoardo Putti](http://edoput.it), Federico Lasta · Japanese: [harupong](http://blog.harupong.com) · Norwegian: [Hallvar Hauge Johnsen](http://www.hyggelaget.no/) · Polish: Emil Maruszczak, Piotr Tarasewicz · Portuguese: [enVide neFelibata](http://www.envidenefelibata.com) · Brazilian Portuguese: Leonardo Barichello, [Carlos Eduardo Pinheiro Rocha](https://www.linkedin.com/in/carlos-eduardo-pinheiro-rocha-1756395b/) · Romanian: [Iain Apreotesei](https://github.com/ibriq), [Catalina Albeanu](https://twitter.com/catalinacma) · Russian: [Pavel Osminin](http://www.proz.com/profile/1783004) · Spanish: [Cristian Duque](https://github.com/crskkk), [Dr J Rogel-Salazar](http://quantumtunnel.wordpress.com), [Adrián Blanco](https://twitter.com/AdrianBlancoR) · Swedish: c3ons · Turkish: Mehmet S. DERİNDERE · Ukrainian: [Myroslav Opyr](https://github.com/myroslav) · Vietnamese: [Trần Ngọc Quân](https://github.com/vnwildman)

More on the [translation wiki](https://github.com/oTranscribe/oTranscribe/wiki/Help-translate-oTranscribe).

---

## Roadmap

Next up after v2.0 ships: opt-in MuckRock account sign-in and cloud transcript backup (never required — local-first stays default). YouTube URL support, library search, and speaker diarization are also on the roadmap.

## Legacy v1

The original v1 codebase lives in `legacy/` for reference. It's not built or tested by the v2 pipeline. Once v2 replaces v1 at the production URL, v1 will continue to be served from `legacy.otranscribe.com` for a documented deprecation window.

## License

MIT.

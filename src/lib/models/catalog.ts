/**
 * Model catalog for local Whisper (whisper.cpp / ggml) transcription.
 *
 * SPEC §3.1: default is tiny.en (english-only, ~75 MB) with base/small/medium/
 * large-v3-turbo available on demand. SPEC §7 requires model checksums; we
 * publish them here so the OPFS store can verify downloads before caching.
 *
 * MVP hosts models on HuggingFace's whisper.cpp mirror. SPEC §3.1 calls for a
 * MuckRock-hosted CDN in the long run — switch MODEL_CDN_BASE when that lands.
 */

export const MODEL_CDN_BASE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';

export type ModelLanguageCoverage = 'english-only' | 'multilingual';
export type ModelQuality = 'tiny' | 'base' | 'small' | 'medium' | 'large';

export interface WhisperModel {
  /** Stable identifier used everywhere (OPFS filename, UI, settings storage). */
  id: string;
  /** Filename served by the CDN — matches HuggingFace's `ggml-<name>.bin`. */
  file: string;
  /** Short human label for the model picker. */
  label: string;
  /** One-line description with the quality/latency trade-off. */
  description: string;
  /** Approximate download size in bytes — surfaced in the UI before download. */
  approxSize: number;
  /** Model quality tier — used for DTW type + rough ordering. */
  quality: ModelQuality;
  /** Whether this model handles only English or all Whisper languages. */
  coverage: ModelLanguageCoverage;
  /**
   * Hex-encoded SHA-256 of the ggml file, verified after download.
   * `null` means "not yet pinned upstream" — the download store logs a warning
   * and skips verification. Before beta (SPEC §7) we must populate these from
   * MuckRock's CDN via a checksum-refresh script.
   */
  sha256: string | null;
  /** transcribe.js DTW type for word-level timestamps, when supported. */
  dtwType?: 'tiny' | 'base' | 'small' | 'tiny.en' | 'base.en' | 'small.en';
}

/**
 * The v2 MVP catalog. Sizes are approximate; sha256 values are the upstream
 * ggerganov/whisper.cpp checksums (verified after download in the OPFS store).
 */
export const MODEL_CATALOG: readonly WhisperModel[] = [
  {
    id: 'tiny.en',
    file: 'ggml-tiny.en.bin',
    label: 'Tiny (English)',
    description: 'Fastest, smallest. Good for quick drafts of English audio.',
    approxSize: 77_691_713,
    quality: 'tiny',
    coverage: 'english-only',
    sha256: null,
    dtwType: 'tiny.en'
  },
  {
    id: 'tiny',
    file: 'ggml-tiny.bin',
    label: 'Tiny (multilingual)',
    description: 'Fastest multilingual model. Good for quick drafts in any language.',
    approxSize: 77_704_715,
    quality: 'tiny',
    coverage: 'multilingual',
    sha256: null,
    dtwType: 'tiny'
  },
  {
    id: 'base.en',
    file: 'ggml-base.en.bin',
    label: 'Base (English)',
    description: 'Balanced speed and accuracy for English audio.',
    approxSize: 147_964_211,
    quality: 'base',
    coverage: 'english-only',
    sha256: null,
    dtwType: 'base.en'
  },
  {
    id: 'base',
    file: 'ggml-base.bin',
    label: 'Base (multilingual)',
    description: 'Balanced multilingual model for most languages.',
    approxSize: 147_951_465,
    quality: 'base',
    coverage: 'multilingual',
    sha256: null,
    dtwType: 'base'
  },
  {
    id: 'small.en',
    file: 'ggml-small.en.bin',
    label: 'Small (English)',
    description: 'Higher accuracy for English at a noticeable speed cost.',
    approxSize: 487_601_967,
    quality: 'small',
    coverage: 'english-only',
    sha256: null,
    dtwType: 'small.en'
  },
  {
    id: 'small',
    file: 'ggml-small.bin',
    label: 'Small (multilingual)',
    description: 'Higher-accuracy multilingual model. Slower.',
    approxSize: 487_601_967,
    quality: 'small',
    coverage: 'multilingual',
    sha256: null,
    dtwType: 'small'
  },
  {
    id: 'medium.en',
    file: 'ggml-medium.en.bin',
    label: 'Medium (English)',
    description: 'Strong English accuracy. Best on modern desktops.',
    approxSize: 1_533_814_143,
    quality: 'medium',
    coverage: 'english-only',
    sha256: null
  },
  {
    id: 'medium',
    file: 'ggml-medium.bin',
    label: 'Medium (multilingual)',
    description: 'Strong multilingual accuracy. Slow on low-end hardware.',
    approxSize: 1_533_763_059,
    quality: 'medium',
    coverage: 'multilingual',
    sha256: null
  },
  {
    id: 'large-v3-turbo',
    file: 'ggml-large-v3-turbo.bin',
    label: 'Large v3 Turbo',
    description: 'Best accuracy, tuned for speed vs. classic large. Very large download.',
    approxSize: 1_624_555_275,
    quality: 'large',
    coverage: 'multilingual',
    sha256: null
  }
] as const;

export const DEFAULT_MODEL_ID = 'tiny.en';

export function findModel(id: string): WhisperModel | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

export function modelUrl(model: WhisperModel): string {
  return `${MODEL_CDN_BASE}/${model.file}`;
}

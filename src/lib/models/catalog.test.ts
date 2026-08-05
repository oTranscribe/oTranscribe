import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL_ID, MODEL_CATALOG, findModel, modelUrl } from './catalog';

describe('model catalog', () => {
  it('has a default model that exists in the catalog', () => {
    expect(findModel(DEFAULT_MODEL_ID)).toBeDefined();
  });

  it('all entries have unique ids and non-empty filenames', () => {
    const ids = new Set<string>();
    for (const model of MODEL_CATALOG) {
      expect(ids.has(model.id)).toBe(false);
      ids.add(model.id);
      expect(model.file).toMatch(/^ggml-.+\.bin$/);
      expect(model.approxSize).toBeGreaterThan(0);
      expect(['tiny', 'base', 'small', 'medium', 'large']).toContain(model.quality);
      expect(['english-only', 'multilingual']).toContain(model.coverage);
    }
  });

  it('modelUrl composes CDN base + filename', () => {
    const tiny = findModel(DEFAULT_MODEL_ID)!;
    expect(modelUrl(tiny)).toMatch(/ggml-tiny\.en\.bin$/);
    expect(modelUrl(tiny)).toMatch(/^https?:\/\//);
  });

  it('exposes at least one english-only and one multilingual variant per tier through small', () => {
    const tiers = ['tiny', 'base', 'small'] as const;
    for (const tier of tiers) {
      const forTier = MODEL_CATALOG.filter((m) => m.quality === tier);
      const coverages = new Set(forTier.map((m) => m.coverage));
      expect(coverages.has('english-only')).toBe(true);
      expect(coverages.has('multilingual')).toBe(true);
    }
  });
});

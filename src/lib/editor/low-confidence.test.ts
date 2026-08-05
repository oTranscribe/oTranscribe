import { afterEach, describe, expect, it } from 'vitest';
import { DOMSerializer } from 'prosemirror-model';
import { editorSchema, getLowConfidenceThreshold, setLowConfidenceThreshold } from './schema';

const originalThreshold = getLowConfidenceThreshold();

afterEach(() => {
  setLowConfidenceThreshold(originalThreshold);
});

function renderWhisperMarkAttrs(confidence: number): Record<string, string> {
  const whisper = editorSchema.marks.whisper!;
  const text = editorSchema.text('word', [whisper.create({ start: 0, end: 1, confidence })]);
  const serializer = DOMSerializer.fromSchema(editorSchema);
  const fragment = serializer.serializeFragment(
    editorSchema.node('doc', null, [editorSchema.node('paragraph', null, [text])]).content
  );
  const wrap = document.createElement('div');
  wrap.appendChild(fragment);
  const span = wrap.querySelector('span.whisper');
  if (!span) throw new Error('no whisper span rendered');
  const attrs: Record<string, string> = {};
  for (const a of Array.from(span.attributes)) attrs[a.name] = a.value;
  return attrs;
}

describe('whisper mark low-confidence attribute', () => {
  it('adds data-lowconfidence when confidence is below threshold', () => {
    setLowConfidenceThreshold(0.6);
    const attrs = renderWhisperMarkAttrs(0.4);
    expect(attrs['data-lowconfidence']).toBe('true');
  });

  it('omits data-lowconfidence when confidence meets or exceeds threshold', () => {
    setLowConfidenceThreshold(0.6);
    const attrs = renderWhisperMarkAttrs(0.8);
    expect(attrs['data-lowconfidence']).toBeUndefined();
  });

  it('respects a lowered threshold — same word now passes', () => {
    setLowConfidenceThreshold(0.3);
    const attrs = renderWhisperMarkAttrs(0.4);
    expect(attrs['data-lowconfidence']).toBeUndefined();
  });

  it("clamps thresholds into [0, 1] so pathological values don't escape", () => {
    setLowConfidenceThreshold(5); // clamped to 1
    expect(getLowConfidenceThreshold()).toBe(1);
    setLowConfidenceThreshold(-2); // clamped to 0
    expect(getLowConfidenceThreshold()).toBe(0);
  });
});

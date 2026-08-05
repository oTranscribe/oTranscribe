import { describe, expect, it } from 'vitest';
import { editorSchema } from '$lib/editor';
import { extractCues } from './cues';
import { makeFixtureDoc } from './fixtures';

describe('extractCues', () => {
  it('produces one cue per whisper-marked paragraph, stripping the leading timestamp node', () => {
    const cues = extractCues(makeFixtureDoc());
    expect(cues).toEqual([
      { start: 12.5, end: 15.25, text: 'Reporter: When did you first hear?' },
      { start: 75, end: 78.4, text: 'Source: Around one fifteen.' }
    ]);
  });

  it('skips paragraphs with no whisper marks — user-typed prose has no timing', () => {
    const { paragraph } = editorSchema.nodes;
    const doc = editorSchema.node('doc', null, [
      paragraph.create({}, [editorSchema.text('Bare typed paragraph.')])
    ]);
    expect(extractCues(doc)).toEqual([]);
  });

  it('spans the earliest start to the latest end across multiple marks in one paragraph', () => {
    const { paragraph } = editorSchema.nodes;
    const whisper = editorSchema.marks.whisper;
    const doc = editorSchema.node('doc', null, [
      paragraph.create({}, [
        editorSchema.text('a', [whisper.create({ start: 5, end: 6, confidence: 1 })]),
        editorSchema.text(' b', [whisper.create({ start: 6, end: 8, confidence: 1 })])
      ])
    ]);
    expect(extractCues(doc)).toEqual([{ start: 5, end: 8, text: 'a b' }]);
  });
});

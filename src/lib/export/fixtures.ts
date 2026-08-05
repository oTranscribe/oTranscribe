import { editorSchema } from '$lib/editor';
import type { Session } from '$lib/storage';

/**
 * Build a two-paragraph doc that mirrors what Whisper streaming produces:
 * each paragraph starts with a timestamp node and its text carries a
 * `whisper` mark with `{start, end, confidence}`. Used across the format
 * unit tests so all six exports are exercised against the same source.
 */
export function makeFixtureDoc() {
  const { paragraph, timestamp } = editorSchema.nodes;
  const whisper = editorSchema.marks.whisper;
  const t = (s: string) => editorSchema.text(s);
  const w = (s: string, start: number, end: number, confidence = 1) =>
    editorSchema.text(s, [whisper.create({ start, end, confidence })]);
  return editorSchema.node('doc', null, [
    paragraph.create({}, [
      timestamp.create({ time: 12.5 }),
      t(' '),
      w('Reporter: When did you first hear?', 12.5, 15.25)
    ]),
    paragraph.create({}, [
      timestamp.create({ time: 75 }),
      t(' '),
      w('Source: Around one fifteen.', 75, 78.4, 0.42)
    ])
  ]);
}

export function makeFixtureSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess_test',
    title: 'Interview with source',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    media: { name: 'interview.mp3', type: 'audio/mpeg', size: 123456, duration: 90 },
    text: '',
    textDoc: null,
    playbackTime: 42,
    language: 'en',
    syncStatus: 'local-only',
    ...overrides
  };
}

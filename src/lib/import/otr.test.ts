import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { editorSchema } from '$lib/editor';
import { importOtrFile } from './otr';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const V1_FIXTURE = path.resolve(HERE, '../../../e2e/fixtures/sample-v1.otr');

function fileFromString(name: string, contents: string): File {
  return new File([contents], name, { type: 'application/json' });
}

describe('importOtrFile', () => {
  it('imports the real v1 fixture, preserves timestamps, and sets media hint', async () => {
    const raw = readFileSync(V1_FIXTURE, 'utf-8');
    const result = await importOtrFile(fileFromString('interview.otr', raw));
    expect(result.format).toBe('otr-v1');
    expect(result.mediaHint).toBe('interview.mp3');
    expect(result.playbackTime).toBe(75);
    expect(result.title).toBe('interview');

    const doc = editorSchema.nodeFromJSON(
      result.textDoc as Parameters<typeof editorSchema.nodeFromJSON>[0]
    );
    const timestamps: number[] = [];
    doc.descendants((n) => {
      if (n.type.name === 'timestamp') timestamps.push(n.attrs.time as number);
    });
    expect(timestamps).toEqual([12.5, 75]);
    expect(result.text).toContain('When did you first hear');
  });

  it('recognizes v2 files by otrVersion', async () => {
    const v2Payload = {
      otrVersion: 2,
      sessionId: 'sess_abc',
      language: 'fr',
      media: 'source.mp3',
      'media-time': 30,
      'media-source': '',
      text: '<p>hi</p>',
      textDoc: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }]
      },
      whisperRanges: true,
      syncMeta: null
    };
    const result = await importOtrFile(fileFromString('demo.otr', JSON.stringify(v2Payload)));
    expect(result.format).toBe('otr-v2');
    expect(result.language).toBe('fr');
    expect(result.playbackTime).toBe(30);
    expect(result.title).toBe('demo');
  });
});

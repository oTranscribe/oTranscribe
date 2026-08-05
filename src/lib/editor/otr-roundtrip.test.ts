import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { docFromOtr, type OtrV1File } from './otr-import';
import { docToV1Html } from './otr-export';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.resolve(HERE, '../../../e2e/fixtures/sample-v1.otr');

describe('v1 .otr roundtrip', () => {
  it('imports the real v1 fixture and re-exports HTML containing all timestamps', () => {
    const raw = readFileSync(FIXTURE, 'utf-8');
    const parsed = JSON.parse(raw) as OtrV1File;
    const doc = docFromOtr(parsed);
    // Text preserved
    expect(doc.textContent).toContain('When did you first hear about the incident?');
    expect(doc.textContent).toContain('the call came around');

    // Timestamps preserved (both numeric values)
    const times: number[] = [];
    doc.descendants((node) => {
      if (node.type.name === 'timestamp') times.push(node.attrs.time as number);
    });
    expect(times).toEqual([12.5, 75]);

    // Export back to v1-style HTML — must round-trip the timestamp data.
    const html = docToV1Html(doc);
    expect(html).toContain('data-timestamp="12.5"');
    expect(html).toContain('data-timestamp="75"');
    expect(html).toMatch(/class="timestamp"/);

    // A re-import of the exported HTML preserves the same times.
    const reImported = docFromOtr({ text: html });
    const roundTripTimes: number[] = [];
    reImported.descendants((node) => {
      if (node.type.name === 'timestamp') roundTripTimes.push(node.attrs.time as number);
    });
    expect(roundTripTimes).toEqual([12.5, 75]);
  });
});

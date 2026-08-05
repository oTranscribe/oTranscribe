import { describe, expect, it } from 'vitest';
import { greeting } from './greeting';

describe('greeting', () => {
  it('returns "Hello <name>"', () => {
    expect(greeting('oTranscribe v2')).toBe('Hello oTranscribe v2');
  });
});

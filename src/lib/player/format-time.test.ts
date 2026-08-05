import { describe, expect, it } from 'vitest';
import { formatTime } from './format-time';

describe('formatTime', () => {
  it('formats sub-minute values', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9)).toBe('0:09');
    expect(formatTime(59)).toBe('0:59');
  });

  it('formats minute-scale values', () => {
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(90.4)).toBe('1:30');
  });

  it('formats hour-scale values with zero-padded minutes', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(3661)).toBe('1:01:01');
  });

  it('handles invalid input', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(-1)).toBe('0:00');
  });
});

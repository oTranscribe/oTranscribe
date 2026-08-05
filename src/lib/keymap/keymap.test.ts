import { describe, expect, it } from 'vitest';
import { V1_KEYMAP, V2_KEYMAP, findAction, matches } from './keymap';

function ev(init: Partial<KeyboardEvent>): KeyboardEvent {
  return new KeyboardEvent('keydown', init);
}

describe('v1 keymap', () => {
  it('resolves function-key skip bindings', () => {
    expect(findAction(ev({ key: 'F1' }), V1_KEYMAP)).toBe('skipBack');
    expect(findAction(ev({ key: 'F2' }), V1_KEYMAP)).toBe('skipForward');
    expect(findAction(ev({ key: 'F3' }), V1_KEYMAP)).toBe('speedDown');
    expect(findAction(ev({ key: 'F4' }), V1_KEYMAP)).toBe('speedUp');
  });

  it('resolves Escape for play/pause', () => {
    expect(findAction(ev({ key: 'Escape' }), V1_KEYMAP)).toBe('playPause');
  });

  it('does not resolve F1 in v2 keymap', () => {
    expect(findAction(ev({ key: 'F1' }), V2_KEYMAP)).toBeNull();
  });

  it('does not resolve Escape in v2 keymap', () => {
    expect(findAction(ev({ key: 'Escape' }), V2_KEYMAP)).toBeNull();
  });
});

describe('v2 keymap', () => {
  it('resolves Ctrl/Cmd+Enter for play/pause', () => {
    expect(findAction(ev({ key: 'Enter', ctrlKey: true }), V2_KEYMAP)).toBe('playPause');
    expect(findAction(ev({ key: 'Enter', metaKey: true }), V2_KEYMAP)).toBe('playPause');
  });

  it('does not fire play/pause on a bare Enter (paragraph break)', () => {
    expect(findAction(ev({ key: 'Enter' }), V2_KEYMAP)).toBeNull();
  });

  it('resolves Ctrl+comma for skip back and Ctrl+Shift+comma for speed down', () => {
    expect(findAction(ev({ key: ',', ctrlKey: true }), V2_KEYMAP)).toBe('skipBack');
    expect(findAction(ev({ key: ',', ctrlKey: true, shiftKey: true }), V2_KEYMAP)).toBe(
      'speedDown'
    );
  });

  it('requires the modifier for skip binding', () => {
    expect(findAction(ev({ key: ',' }), V2_KEYMAP)).toBeNull();
  });
});

describe('matches', () => {
  it('honors an explicit shift: false requirement', () => {
    expect(matches(ev({ key: ',', ctrlKey: true }), V2_KEYMAP.skipBack)).toBe(true);
    expect(matches(ev({ key: ',', ctrlKey: true, shiftKey: true }), V2_KEYMAP.skipBack)).toBe(
      false
    );
  });
});

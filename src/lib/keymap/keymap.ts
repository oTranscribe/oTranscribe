export type KeymapMode = 'v1-legacy' | 'v2-default';

export type ActionId =
  'playPause' | 'skipBack' | 'skipForward' | 'speedDown' | 'speedUp' | 'insertTimestamp';

export interface Binding {
  /** `event.key` value to match, compared case-insensitively */
  key: string;
  /** true = required, false = required absent, undefined = don't care */
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export type Keymap = Record<ActionId, Binding>;

export const V1_KEYMAP: Keymap = {
  playPause: { key: 'Escape' },
  skipBack: { key: 'F1' },
  skipForward: { key: 'F2' },
  speedDown: { key: 'F3' },
  speedUp: { key: 'F4' },
  insertTimestamp: { key: '`', mod: true }
};

export const V2_KEYMAP: Keymap = {
  playPause: { key: 'Enter', mod: true },
  skipBack: { key: ',', mod: true, shift: false },
  skipForward: { key: '.', mod: true, shift: false },
  speedDown: { key: ',', mod: true, shift: true },
  speedUp: { key: '.', mod: true, shift: true },
  insertTimestamp: { key: ';', mod: true }
};

export function getKeymap(mode: KeymapMode): Keymap {
  return mode === 'v1-legacy' ? V1_KEYMAP : V2_KEYMAP;
}

export function matches(event: KeyboardEvent, binding: Binding): boolean {
  if (event.key.toLowerCase() !== binding.key.toLowerCase()) return false;
  const mod = event.ctrlKey || event.metaKey;
  if (binding.mod !== undefined && binding.mod !== mod) return false;
  if (binding.shift !== undefined && binding.shift !== event.shiftKey) return false;
  if (binding.alt !== undefined && binding.alt !== event.altKey) return false;
  return true;
}

export function findAction(event: KeyboardEvent, keymap: Keymap): ActionId | null {
  for (const [action, binding] of Object.entries(keymap) as [ActionId, Binding][]) {
    if (matches(event, binding)) return action;
  }
  return null;
}

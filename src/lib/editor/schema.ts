import { Schema, type DOMOutputSpec } from 'prosemirror-model';
import { formatTime } from '$lib/player';
import { DEFAULT_LOW_CONFIDENCE_THRESHOLD } from '$lib/settings';

const readNumber = (raw: unknown, fallback = 0): number => {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isFinite(n) ? n : fallback;
};

/**
 * The schema's `toDOM` is called for every mark render but has no access to
 * runtime settings. We read this module-level ref instead; the settings screen
 * (and the session route on load) updates it so re-renders pick up new values.
 * Threshold is a soft signal — no persistence integrity depends on it.
 */
let LOW_CONFIDENCE_THRESHOLD = DEFAULT_LOW_CONFIDENCE_THRESHOLD;

export function setLowConfidenceThreshold(value: number): void {
  LOW_CONFIDENCE_THRESHOLD = Math.max(0, Math.min(1, value));
}

export function getLowConfidenceThreshold(): number {
  return LOW_CONFIDENCE_THRESHOLD;
}

export const editorSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM: (): DOMOutputSpec => ['p', 0]
    },
    text: { group: 'inline' },
    timestamp: {
      inline: true,
      group: 'inline',
      atom: true,
      selectable: true,
      draggable: false,
      attrs: {
        time: { default: 0 }
      },
      parseDOM: [
        {
          tag: 'span.timestamp',
          getAttrs: (el) => {
            if (typeof el === 'string') return false;
            const raw =
              el.getAttribute('data-time') ??
              el.getAttribute('data-timestamp') ??
              el.textContent ??
              '';
            return { time: parseTimestamp(raw) };
          }
        }
      ],
      toDOM: (node): DOMOutputSpec => [
        'span',
        {
          class: 'timestamp',
          contenteditable: 'false',
          'data-time': String(node.attrs.time),
          'data-timestamp': String(node.attrs.time)
        },
        formatTime(node.attrs.time as number)
      ]
    },
    hardBreak: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM: (): DOMOutputSpec => ['br']
    }
  },
  marks: {
    whisper: {
      attrs: {
        start: { default: 0 },
        end: { default: 0 },
        confidence: { default: 1 }
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'span.whisper',
          getAttrs: (el) => {
            if (typeof el === 'string') return false;
            return {
              start: readNumber(el.getAttribute('data-start')),
              end: readNumber(el.getAttribute('data-end')),
              confidence: readNumber(el.getAttribute('data-confidence'), 1)
            };
          }
        }
      ],
      toDOM: (mark): DOMOutputSpec => {
        const confidence = Number(mark.attrs.confidence);
        const isLow = Number.isFinite(confidence) && confidence < LOW_CONFIDENCE_THRESHOLD;
        return [
          'span',
          {
            class: 'whisper',
            'data-start': String(mark.attrs.start),
            'data-end': String(mark.attrs.end),
            'data-confidence': String(mark.attrs.confidence),
            ...(isLow ? { 'data-lowconfidence': 'true' } : {})
          },
          0
        ];
      }
    }
  }
});

export function parseTimestamp(raw: string): number {
  if (!raw) return 0;
  const trimmed = raw.trim();
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber)) return asNumber;
  const parts = trimmed.split(':').map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p))) return 0;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  return parts[0] ?? 0;
}

export function emptyDoc() {
  return editorSchema.node('doc', null, [editorSchema.node('paragraph')]).toJSON();
}

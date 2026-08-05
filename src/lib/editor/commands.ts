import type { Command } from 'prosemirror-state';
import { editorSchema } from './schema';

export function insertTimestampCommand(time: number): Command {
  return (state, dispatch) => {
    const node = editorSchema.nodes.timestamp?.create({ time });
    if (!node) return false;
    if (dispatch) {
      const tr = state.tr.replaceSelectionWith(node, false);
      tr.insertText(' ');
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
}

export interface WhisperSegmentInsert {
  /** Segment start in seconds — becomes the leading timestamp chip's time attribute. */
  start: number;
  /** Segment end in seconds — closes the whisper mark's range. */
  end: number;
  /** Text content (leading/trailing whitespace is trimmed by the command). */
  text: string;
  /** Whisper's average confidence for this segment, 0..1. */
  confidence: number;
}

/**
 * Append one Whisper segment to the end of the doc: a `[HH:MM:SS]` timestamp
 * node followed by the segment text carrying a `whisper` mark with the range.
 *
 * Streaming safety: we always append at doc-end, not at the cursor, so the
 * user can keep editing already-transcribed text without racing this command.
 * Each segment lands in its own paragraph — natural breaks for a long transcript
 * and easy to merge later if we ever want to (Phase 5 export polish).
 */
export function appendWhisperSegmentCommand(segment: WhisperSegmentInsert): Command {
  return (state, dispatch) => {
    const { timestamp: tsNode, paragraph, text: textNode } = editorSchema.nodes;
    const whisper = editorSchema.marks.whisper;
    if (!tsNode || !paragraph || !textNode || !whisper) return false;
    if (!dispatch) return true;

    const text = segment.text.trim();
    const inline: Array<ReturnType<typeof tsNode.create>> = [
      tsNode.create({ time: segment.start })
    ];
    if (text) {
      const marks = [
        whisper.create({
          start: segment.start,
          end: segment.end,
          confidence: segment.confidence
        })
      ];
      // Leading space so the timestamp chip visually separates from the text.
      inline.push(editorSchema.text(` ${text}`, marks));
    }
    const newParagraph = paragraph.create(null, inline);

    let tr = state.tr;
    const lastBlock = state.doc.lastChild;
    const docEnd = state.doc.content.size;
    // Replace an empty trailing paragraph in place; otherwise append a fresh one.
    if (lastBlock && lastBlock.type.name === 'paragraph' && lastBlock.content.size === 0) {
      const paragraphStart = docEnd - lastBlock.nodeSize;
      tr = tr.replaceWith(paragraphStart, docEnd, newParagraph);
    } else {
      tr = tr.insert(docEnd, newParagraph);
    }

    dispatch(tr.scrollIntoView());
    return true;
  };
}

import { Plugin } from 'prosemirror-state';
import type { PlayerContext } from '$lib/player';

export function timestampClickPlugin(player: PlayerContext): Plugin {
  return new Plugin({
    props: {
      handleClickOn(_view, _pos, node, _nodePos, event) {
        if (node.type.name !== 'timestamp') return false;
        const time = Number(node.attrs.time);
        if (!Number.isFinite(time)) return false;
        event.preventDefault();
        player.seek(time);
        return true;
      }
    }
  });
}

/**
 * SPEC §3.2 — clicking a whisper-marked word seeks the player to that mark's
 * start **only while paused**. During playback the click is a plain cursor
 * placement — journalists are actively editing while the audio runs, and every
 * mis-click jumping the playhead is more disruptive than helpful. Explicit
 * seek gestures during playback: timestamp chips + keyboard shortcuts.
 *
 * Rationale for the paused-only behavior: parking the caret sets an implicit
 * "start from here on play" pointer (via `getCursorWhisperStart` + the play
 * shortcut). Users can pause, click around to review, then hit play to resume
 * from wherever they landed.
 */
export function whisperClickSeekPlugin(player: PlayerContext): Plugin {
  return new Plugin({
    props: {
      handleClick(view, pos, event) {
        // Modifier-click, right-click, or drag-to-select should not seek.
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return false;
        if (player.isPlaying) return false;

        const $pos = view.state.doc.resolve(pos);
        const marks = $pos.marks();
        const whisper = marks.find((m) => m.type.name === 'whisper');
        if (!whisper) return false;
        const start = Number(whisper.attrs.start);
        if (!Number.isFinite(start)) return false;
        player.seek(start);
        // Don't preventDefault — we still want the cursor to land where the user clicked.
        return false;
      }
    }
  });
}

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { EditorState, type Transaction } from 'prosemirror-state';
  import { EditorView } from 'prosemirror-view';
  import { history, redo, undo } from 'prosemirror-history';
  import { keymap } from 'prosemirror-keymap';
  import { baseKeymap } from 'prosemirror-commands';
  import { Node as PMNode } from 'prosemirror-model';
  import type { PlayerContext } from '$lib/player';
  import { editorSchema, emptyDoc } from './schema';
  import { timestampClickPlugin, whisperClickSeekPlugin } from './plugins';
  import { playbackHighlightPlugin, setActiveTime } from './highlight-active';
  import { autoScrollPlugin, setAutoScrollEnabled, setAutoScrollTime } from './auto-scroll';
  import { selectionBoundPlugin } from './selection-bound';
  import { typingDuringPlaybackPlugin } from './typing-mark';
  import { appendWhisperSegmentCommand, insertTimestampCommand } from './commands';
  import type { WhisperSegmentInsert } from './commands';

  export interface EditorApi {
    insertTimestamp: (time: number) => void;
    appendWhisperSegment: (segment: WhisperSegmentInsert) => void;
    focus: () => void;
    getDocJson: () => unknown;
    /**
     * Return the whisper mark at (or immediately before) the current cursor, or
     * null if none is nearby. Used by the "play from cursor" shortcut in the
     * session route.
     */
    getCursorWhisperStart: () => number | null;
  }

  interface Props {
    initialDoc: unknown;
    player: PlayerContext;
    onChange?: (docJson: unknown, plainText: string) => void;
    onReady?: (api: EditorApi) => void;
    ariaLabel?: string;
    testId?: string;
    autoScroll?: boolean;
  }

  let {
    initialDoc,
    player,
    onChange,
    onReady,
    ariaLabel,
    testId,
    autoScroll = true
  }: Props = $props();

  let mountEl = $state<HTMLDivElement | null>(null);
  let view: EditorView | null = null;

  function docFromJson(json: unknown): PMNode {
    try {
      const j = (json ?? emptyDoc()) as Parameters<typeof PMNode.fromJSON>[1];
      return PMNode.fromJSON(editorSchema, j);
    } catch {
      return PMNode.fromJSON(editorSchema, emptyDoc());
    }
  }

  /**
   * Walk backward from `pos` to find the nearest whisper-marked text node's
   * start time. Preferring "at or before" so pressing Play with the cursor
   * anywhere between two marks resumes from the most recently spoken chunk.
   */
  function findWhisperStartAtOrBefore(doc: PMNode, pos: number): number | null {
    let best: number | null = null;
    let bestPos = -1;
    doc.descendants((node, nodePos) => {
      if (!node.isText) return true;
      const nodeEnd = nodePos + node.nodeSize;
      if (nodePos > pos) return false; // walked past the cursor
      const whisper = node.marks.find((m) => m.type.name === 'whisper');
      if (!whisper) return true;
      const start = Number(whisper.attrs.start);
      if (!Number.isFinite(start)) return true;
      // Prefer the closest-preceding mark; if two share position, later one wins.
      if (nodeEnd >= bestPos) {
        best = start;
        bestPos = nodeEnd;
      }
      return true;
    });
    return best;
  }

  function plainTextOf(doc: PMNode): string {
    const parts: string[] = [];
    doc.forEach((block) => {
      const seg: string[] = [];
      block.forEach((inline) => {
        if (inline.isText) seg.push(inline.text ?? '');
        else if (inline.type.name === 'timestamp') seg.push(`[${inline.attrs.time}]`);
      });
      parts.push(seg.join(''));
    });
    return parts.join('\n');
  }

  onMount(() => {
    if (!mountEl) return;

    const state = EditorState.create({
      doc: docFromJson(initialDoc),
      plugins: [
        history(),
        keymap({
          'Mod-z': undo,
          'Mod-y': redo,
          'Shift-Mod-z': redo
        }),
        keymap(baseKeymap),
        timestampClickPlugin(player),
        whisperClickSeekPlugin(player),
        selectionBoundPlugin(player),
        typingDuringPlaybackPlugin(player),
        playbackHighlightPlugin(player),
        autoScrollPlugin(autoScroll)
      ]
    });

    view = new EditorView(mountEl, {
      state,
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': ariaLabel ?? 'Transcript'
      },
      dispatchTransaction(this: EditorView, tr: Transaction) {
        const next = this.state.apply(tr);
        this.updateState(next);
        if (tr.docChanged) {
          onChange?.(next.doc.toJSON(), plainTextOf(next.doc));
        }
      }
    });

    const api: EditorApi = {
      insertTimestamp(time: number) {
        if (!view) return;
        insertTimestampCommand(time)(view.state, view.dispatch);
        view.focus();
      },
      appendWhisperSegment(segment) {
        if (!view) return;
        appendWhisperSegmentCommand(segment)(view.state, view.dispatch);
      },
      focus() {
        view?.focus();
      },
      getDocJson() {
        return view?.state.doc.toJSON();
      },
      getCursorWhisperStart() {
        if (!view) return null;
        return findWhisperStartAtOrBefore(view.state.doc, view.state.selection.from);
      }
    };
    onReady?.(api);
  });

  // Drive the highlight + auto-scroll plugins off Svelte reactivity —
  // PlayerContext.currentTime is $state, so this fires on every timeupdate.
  $effect(() => {
    const t = player.currentTime;
    if (!view) return;
    setActiveTime(view, t);
    setAutoScrollTime(view, t);
  });

  // Propagate autoScroll prop changes into the plugin.
  $effect(() => {
    if (view) setAutoScrollEnabled(view, autoScroll);
  });

  onDestroy(() => {
    view?.destroy();
    view = null;
  });
</script>

<div
  bind:this={mountEl}
  class="editor"
  data-testid={testId}
  spellcheck="false"
  aria-label={ariaLabel ?? 'Transcript'}
></div>

<style>
  .editor {
    height: 100%;
    overflow: auto;
    padding: 2rem 3rem;
  }

  .editor :global(.ProseMirror) {
    outline: none;
    font-family: var(--font-body-transcript);
    font-size: var(--font-size-transcript);
    line-height: var(--font-line-transcript);
    color: var(--color-text);
    min-height: 100%;
  }

  .editor :global(.ProseMirror p) {
    margin: 0 0 1em;
  }

  .editor :global(.ProseMirror p:last-child) {
    margin-bottom: 0;
  }

  .editor :global(.timestamp) {
    display: inline-block;
    color: var(--color-accent);
    border-left: 2px solid var(--color-accent);
    border-right: 2px solid var(--color-accent);
    border-radius: var(--radius-chip);
    padding: 0 0.25rem;
    margin: 0 0.15rem;
    font-size: 0.9em;
    cursor: pointer;
    user-select: none;
  }
  .editor :global(.timestamp:hover) {
    background: var(--color-accent-tint);
  }

  /* Highlight applied by playbackHighlightPlugin — solid fill when the playhead
     brackets a whisper mark's {start, end}. */
  .editor :global(.whisper-active--solid) {
    background: var(--color-accent-tint, rgba(52, 130, 177, 0.18));
    border-radius: 2px;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    transition: background 120ms linear;
  }

  /* Low-confidence whisper words get a spellcheck-style wavy underline. */
  .editor :global(.whisper[data-lowconfidence='true']) {
    text-decoration: underline wavy #b95a00;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }
</style>

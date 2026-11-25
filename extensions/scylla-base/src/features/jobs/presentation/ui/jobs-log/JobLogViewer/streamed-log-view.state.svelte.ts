import { untrack } from 'svelte';
import { EditorView } from '@codemirror/view';
import type { LogLine } from '@base/features/jobs/presentation/presenters/log-lines.presenter.ts';

const TAIL_THRESHOLD_PX = 24;

/** The lines that the viewer shows. Another `key` (another node) replaces the document. */
export interface LogSource {
  key: string;
  lines: readonly Pick<LogLine, 'text'>[];
  /** The lines to show: the array can grow in place before a new source is read. */
  count: number;
}

export interface StreamedLogView {
  attach: (view: EditorView | null) => void;
  readonly view: EditorView | null;
  /** The view goes down with each new line until the reader scrolls up or selects. */
  readonly isFollowing: boolean;
  /** The lines written since the reader stopped following. */
  readonly newLines: number;
  /** Goes to the end of the log and follows it again. */
  follow: () => void;
  /** Stops following: the view moved to a line that the reader asked for. */
  unfollow: () => void;
}

const textOf = (lines: LogSource['lines'], from: number, to: number) =>
  lines
    .slice(from, to)
    .map(line => line.text)
    .join('\n');

/**
 * Feeds a growing log into CodeMirror and follows the tail like an IDE console,
 * until the reader scrolls up or selects; following resumes at the end.
 * The document is only appended to: replacing it would lose the scroll and the
 * selection. It is replaced only for another node, or when the stream restarts.
 */
export const createStreamedLogView = (source: () => LogSource): StreamedLogView => {
  let view = $state.raw<EditorView | null>(null);
  let isFollowing = $state(true);
  /** The number of lines when the reader stopped following. */
  let seen = $state(0);
  let written = 0;
  let writtenKey: string | null = null;
  let hasAnchored = false;

  $effect(() => {
    const { key, lines, count } = source();
    if (!view) return;

    if (key !== writtenKey || count < written) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: textOf(lines, 0, count) },
      });
      if (key !== writtenKey) {
        // Another node opens on its end, like the page.
        writtenKey = key;
        hasAnchored = false;
        isFollowing = true;
      }
      written = count;
      return;
    }
    if (count === written) return;

    view.dispatch({
      changes: {
        from: view.state.doc.length,
        insert: `${written > 0 ? '\n' : ''}${textOf(lines, written, count)}`,
      },
    });
    written = count;
  });

  $effect(() => {
    const { count } = source();
    if (!view || !isFollowing || count === 0) return;

    const end = view.state.doc.length;

    // A finished job arrives whole: jump to the end (CodeMirror only renders the viewport).
    // The end of the text, not the start of the last line: a wrapped line has several rows.
    if (!hasAnchored) {
      hasAnchored = true;
      view.dispatch({ effects: EditorView.scrollIntoView(end, { y: 'end' }) });
      return;
    }

    // Then a few lines at a time: a frame later, smoothly.
    const scroller = view.scrollDOM;
    const frame = requestAnimationFrame(() => {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    });

    return () => cancelAnimationFrame(frame);
  });

  // Also called from an effect of the viewer: it must not follow `isFollowing`.
  const stopFollowing = () =>
    untrack(() => {
      if (!isFollowing) return;
      isFollowing = false;
      seen = written;
    });

  $effect(() => {
    if (!view) return;

    const scroller = view.scrollDOM;
    const ownerDocument = scroller.ownerDocument;
    const editor = view;
    let frame = 0;

    const isAtTail = () =>
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= TAIL_THRESHOLD_PX;

    // Read-only viewer: a drag leaves a native selection.
    const hasSelection = () => {
      if (!editor.state.selection.main.empty) return true;

      const selection = ownerDocument.getSelection();
      return !!selection && !selection.isCollapsed && scroller.contains(selection.anchorNode);
    };

    const resync = () => {
      if (isAtTail() && !hasSelection()) isFollowing = true;
      else stopFollowing();
    };

    // Wheel and keys fire before the scroll: read the position a frame later.
    const handleUserScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resync);
    };

    const handlePointerDown = (event: PointerEvent) => {
      // A link of a line number is not a scroll.
      if ((event.target as Element | null)?.closest('a')) return;
      stopFollowing();
      // Abort the smooth scroll under a drag, or the selection slides away.
      scroller.scrollTo({ top: scroller.scrollTop, behavior: 'instant' });
    };

    // On the document: a drag can end outside the log, and a touch scroll ends on `pointercancel`.
    const handleGestureEnd = () => resync();

    scroller.addEventListener('wheel', handleUserScroll, { passive: true });
    scroller.addEventListener('pointerdown', handlePointerDown);
    scroller.addEventListener('keydown', handleUserScroll);
    ownerDocument.addEventListener('pointerup', handleGestureEnd);
    ownerDocument.addEventListener('pointercancel', handleGestureEnd);
    ownerDocument.addEventListener('touchend', handleGestureEnd);

    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('wheel', handleUserScroll);
      scroller.removeEventListener('pointerdown', handlePointerDown);
      scroller.removeEventListener('keydown', handleUserScroll);
      ownerDocument.removeEventListener('pointerup', handleGestureEnd);
      ownerDocument.removeEventListener('pointercancel', handleGestureEnd);
      ownerDocument.removeEventListener('touchend', handleGestureEnd);
    };
  });

  return {
    attach: (created: EditorView | null) => {
      view = created;
      written = 0;
      writtenKey = null;
      if (!created) hasAnchored = false;
    },
    get view() {
      return view;
    },
    get isFollowing() {
      return isFollowing;
    },
    get newLines() {
      return isFollowing ? 0 : Math.max(0, source().count - seen);
    },
    follow: () => {
      hasAnchored = false;
      isFollowing = true;
    },
    unfollow: stopFollowing,
  };
};

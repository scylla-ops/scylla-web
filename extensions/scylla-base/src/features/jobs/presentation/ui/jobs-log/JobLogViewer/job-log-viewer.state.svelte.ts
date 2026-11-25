import { untrack } from 'svelte';
import { EditorView } from '@codemirror/view';
import { currentPathname, currentSearch, navigateTo } from '@platform/context';
import { intlLocale, t } from '@scylla/ui/i18n';
import {
  errorLineIndexes,
  findLogMatches,
  hashOfLine,
  lineOfHash,
  logDownloadText,
  type LogLine,
} from '@base/features/jobs/presentation/presenters/log-lines.presenter.ts';
import { jobLogMessages } from '@base/features/jobs/presentation/messages/job-log.messages.ts';
import type { TailedLogs } from '../tail-job-logs.state.svelte.ts';
import type { LogDisplaySettings } from '../log-display-settings.state.svelte.ts';
import { createLogCursor } from './log-cursor.state.svelte.ts';
import { createStreamedLogView, type LogSource } from './streamed-log-view.state.svelte.ts';
import { logEditorExtensions, refreshLog, type LogEditorSource } from './log-editor.ts';

export interface JobLogViewerOptions {
  /** The stream of the whole job. */
  tail: () => TailedLogs;
  /** The node of the log, or `null` for the whole job. */
  nodeId: () => string | null;
  settings: () => LogDisplaySettings;
}

// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a cache of the formats of each locale, never state
const timeFormats = new Map<string, { time: Intl.DateTimeFormat; full: Intl.DateTimeFormat }>();

const formatTime = (timestamp: string) => {
  const locale = intlLocale();
  let formats = timeFormats.get(locale);
  if (!formats) {
    formats = {
      time: new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }),
      full: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }),
    };
    timeFormats.set(locale, formats);
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return { text: '', title: '' };
  return { text: formats.time.format(date), title: formats.full.format(date) };
};

/**
 * The log of one node or of the whole job in the viewer: the document and its tail, the search,
 * the errors, and the line of the link of the page (`#L150`).
 */
export const createJobLogViewer = ({ tail, nodeId, settings }: JobLogViewerOptions) => {
  const source = $derived.by((): LogSource & { lines: readonly LogLine[] } => {
    const logs = tail();
    void logs.version;
    const id = nodeId();
    const lines = logs.linesOf(id);
    return { key: id === null ? '*' : `node:${id}`, lines, count: lines.length };
  });

  const stream = createStreamedLogView(() => source);

  // The URL of the page with no hash: a link to a line keeps the node and the full screen.
  const pageUrl = $derived(`${currentPathname()}${currentSearch().split('#')[0]}`);
  const lineUrl = (line: number) => `${pageUrl}${hashOfLine(line)}`;

  let query = $state('');
  const matches = $derived(findLogMatches(source.lines, query));
  const search = createLogCursor(() => matches);
  const errors = createLogCursor(() => errorLineIndexes(source.lines));

  // The line of the link applies to the node of the link: another node drops it.
  let target = $state<{ line: number; key: string } | null>(null);
  const initialLine = lineOfHash(globalThis.location?.hash ?? '');
  if (initialLine !== null) target = { line: initialLine, key: untrack(() => source.key) };
  const targetLine = $derived(target && target.key === source.key ? target.line : null);
  let revealedTarget = false;

  const reveal = (line: number, align: 'center' | 'start' = 'center') => {
    const view = stream.view;
    if (!view || line < 1 || line > view.state.doc.lines) return;
    stream.unfollow();
    view.dispatch({
      effects: EditorView.scrollIntoView(view.state.doc.line(line).from, { y: align }),
    });
  };

  // CodeMirror reads them while it builds or updates the view, which can be inside an effect (the
  // mount of the editor, a dispatch): untracked, or that effect would run again at each flush and
  // build a new editor. `refreshLog` tells the view when they change.
  const editorSource: LogEditorSource = {
    lines: () => untrack(() => source.lines),
    matches: () => untrack(() => matches),
    currentMatch: () => untrack(() => search.index),
    currentError: () => untrack(() => (errors.current === null ? null : errors.current + 1)),
    targetLine: () => untrack(() => targetLine),
    lineHref: line => untrack(() => lineUrl(line)),
    lineLabel: line => untrack(() => t(jobLogMessages.line(line))),
    onLineLink: line => {
      target = { line, key: untrack(() => source.key) };
      stream.unfollow();
      navigateTo(untrack(() => lineUrl(line)), { replace: true });
    },
    formatTime: timestamp => untrack(() => formatTime(timestamp)),
  };

  const hasTimestamps = $derived(!!source.lines[0]?.timestamp);
  const extensions = $derived(
    logEditorExtensions(editorSource, settings(), settings().timestamps && hasTimestamps),
  );

  // Another node: the current match and the current error are of the other log.
  let shownKey = untrack(() => source.key);
  $effect(() => {
    const key = source.key;
    if (key === shownKey) return;
    shownKey = key;
    untrack(() => {
      search.reset();
      errors.reset();
    });
  });

  // The marks of the search, of the errors and of the target line follow their state.
  $effect(() => {
    void [matches, search.index, errors.index, targetLine, pageUrl];
    stream.view?.dispatch({ effects: refreshLog.of(null) });
  });

  // A link to a line opens on it, once its line arrived.
  $effect(() => {
    const line = targetLine;
    if (line === null || revealedTarget || !stream.view || source.count < line) return;
    revealedTarget = true;
    untrack(() => reveal(line));
  });

  return {
    attach: stream.attach,
    get extensions() {
      return extensions;
    },
    get lines() {
      return source.lines;
    },
    get isFollowing() {
      return stream.isFollowing;
    },
    get newLines() {
      return stream.newLines;
    },
    toggleFollow: () => (stream.isFollowing ? stream.unfollow() : stream.follow()),
    follow: stream.follow,

    get query() {
      return query;
    },
    setQuery: (next: string) => {
      query = next;
      search.reset();
      const first = search.next();
      if (first) reveal(first.line + 1);
    },
    search,
    nextMatch: () => {
      const found = search.next();
      if (found) reveal(found.line + 1);
    },
    previousMatch: () => {
      const found = search.previous();
      if (found) reveal(found.line + 1);
    },

    errors,
    nextError: () => {
      const line = errors.next();
      if (line !== null) reveal(line + 1);
    },
    previousError: () => {
      const line = errors.previous();
      if (line !== null) reveal(line + 1);
    },
  };
};

export type JobLogViewerState = ReturnType<typeof createJobLogViewer>;

/** Saves the lines as a file: the clean text, or the raw text with its escape codes. */
export const downloadLog = (lines: readonly LogLine[], raw: boolean, fileName: string) => {
  const blob = new Blob([logDownloadText(lines, raw)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}${raw ? '.raw' : ''}.log`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

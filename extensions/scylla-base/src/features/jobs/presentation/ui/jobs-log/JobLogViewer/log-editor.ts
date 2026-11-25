import { EditorState, StateEffect, type Extension, type Range } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  GutterMarker,
  ViewPlugin,
  gutter,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import type { AnsiSpan } from '@base/features/jobs/presentation/presenters/ansi.presenter.ts';
import type {
  LogLine,
  LogMatch,
} from '@base/features/jobs/presentation/presenters/log-lines.presenter.ts';
import type { LogDisplaySettings, LogTextSize } from '../log-display-settings.state.svelte.ts';

/** What the decorations and the gutters of the log read. Line numbers are from 1. */
export interface LogEditorSource {
  lines: () => readonly LogLine[];
  matches: () => readonly LogMatch[];
  /** The index of the current match, or -1. */
  currentMatch: () => number;
  /** The line of the current error, or `null`. */
  currentError: () => number | null;
  /** The line of the link of the page (`#L150`), or `null`. */
  targetLine: () => number | null;
  lineHref: (line: number) => string;
  lineLabel: (line: number) => string;
  /** A plain click on the number of a line. */
  onLineLink: (line: number) => void;
  formatTime: (timestamp: string) => { text: string; title: string };
}

/** Tells the decorations and the gutters that the search, an error or the target line changed. */
export const refreshLog = StateEffect.define<null>();

const isRefresh = (update: ViewUpdate) =>
  update.transactions.some(transaction =>
    transaction.effects.some(effect => effect.is(refreshLog)),
  );

const FONT_SIZES: Record<LogTextSize, string> = { s: '11px', m: '12px', l: '14px' };

/** The colors of the escape codes, as the tokens of the theme. */
const ANSI_COLORS: Record<string, string> = {
  red: 'var(--status-failed)',
  green: 'var(--success)',
  yellow: 'var(--warning-strong)',
  blue: 'var(--info)',
  magenta: 'var(--status-skipped)',
  cyan: 'var(--chart-3)',
  gray: 'var(--muted-foreground)',
  foreground: 'var(--foreground)',
  background: 'var(--code-editor-bg)',
};

const ansiTheme = Object.fromEntries(
  Object.entries(ANSI_COLORS).flatMap(([name, color]) => [
    [`.ansi-${name}`, { color }],
    [`.ansi-bg-${name}`, { backgroundColor: color }],
  ]),
);

const logTheme = (size: LogTextSize) =>
  EditorView.theme({
    '&': { height: '100%' },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
      fontSize: FONT_SIZES[size],
      lineHeight: '1.6',
    },
    '.cm-gutters': { userSelect: 'none' },
    '.cm-log-line-numbers .cm-gutterElement': { padding: '0 0.5rem 0 0.75rem', textAlign: 'right' },
    '.cm-log-line-link': { color: 'inherit', textDecoration: 'none' },
    '.cm-log-line-link:hover, .cm-log-line-link:focus-visible': {
      color: 'var(--foreground)',
      textDecoration: 'underline',
      outline: 'none',
    },
    '.cm-log-timestamps .cm-gutterElement': {
      padding: '0 0.5rem',
      fontVariantNumeric: 'tabular-nums',
    },
    ...ansiTheme,
    '.ansi-bold': { fontWeight: '700' },
    '.ansi-dim': { color: 'var(--muted-foreground)' },
    '.ansi-link': { textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer' },
    '.cm-log-error': {
      backgroundColor: 'color-mix(in oklab, var(--destructive) 10%, transparent)',
      boxShadow: 'inset 3px 0 0 0 var(--destructive)',
    },
    '.cm-log-error-current': {
      backgroundColor: 'color-mix(in oklab, var(--destructive) 20%, transparent)',
    },
    '.cm-log-target': {
      backgroundColor: 'color-mix(in oklab, var(--primary) 16%, transparent)',
      boxShadow: 'inset 3px 0 0 0 var(--primary)',
    },
    '.cm-log-match': { backgroundColor: 'var(--code-editor-match-bg)', borderRadius: '2px' },
    '.cm-log-match-current': {
      backgroundColor: 'var(--primary)',
      color: 'var(--primary-foreground)',
      borderRadius: '2px',
    },
    // The current match keeps one color, also around or inside a colored part.
    '.cm-log-match-current *, [class*="ansi-"] .cm-log-match-current': {
      color: 'var(--primary-foreground)',
      backgroundColor: 'transparent',
    },
  });

const SAFE_LINK = /^(https?:|mailto:)/i;

const marks = new Map<string, Decoration>();

/** The mark of a span: its colors (inverse swaps them), its weight, its link. */
const markOf = (span: AnsiSpan): Decoration | null => {
  const fg = span.inverse ? (span.bg ?? 'background') : span.fg;
  const bg = span.inverse ? (span.fg ?? 'foreground') : span.bg;
  const classes = [
    fg && `ansi-${fg}`,
    bg && `ansi-bg-${bg}`,
    span.bold && 'ansi-bold',
    span.dim && !fg && 'ansi-dim',
  ].filter(Boolean);
  const href = span.href && SAFE_LINK.test(span.href) ? span.href : undefined;
  if (href) classes.push('ansi-link');
  if (!classes.length) return null;

  const key = `${classes.join(' ')}|${href ?? ''}`;
  let mark = marks.get(key);
  if (!mark) {
    mark = href
      ? Decoration.mark({
          tagName: 'a',
          class: classes.join(' '),
          attributes: { href, target: '_blank', rel: 'noopener noreferrer' },
        })
      : Decoration.mark({ class: classes.join(' ') });
    marks.set(key, mark);
  }
  return mark;
};

const errorLine = Decoration.line({ class: 'cm-log-error' });
const currentErrorLine = Decoration.line({ class: 'cm-log-error cm-log-error-current' });
const targetLine = Decoration.line({ class: 'cm-log-target' });
const match = Decoration.mark({ class: 'cm-log-match' });
const currentMatch = Decoration.mark({ class: 'cm-log-match-current' });

/** The first match on or after `line`. */
const firstMatchFrom = (matches: readonly LogMatch[], line: number): number => {
  let low = 0;
  let high = matches.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (matches[middle].line < line) low = middle + 1;
    else high = middle;
  }
  return low;
};

/** The decorations of the visible lines only: a log has thousands of lines. */
const buildDecorations = (view: EditorView, source: LogEditorSource, ansi: boolean) => {
  const { doc } = view.state;
  const lines = source.lines();
  const matches = source.matches();
  const current = source.currentMatch();
  const error = source.currentError();
  const target = source.targetLine();
  const ranges: Range<Decoration>[] = [];
  let done = 0;

  for (const { from, to } of view.visibleRanges) {
    const first = Math.max(doc.lineAt(from).number, done + 1);
    const last = doc.lineAt(to).number;

    for (let number = first; number <= last; number += 1) {
      const line = doc.line(number);
      const log = lines[number - 1];
      if (number === target) ranges.push(targetLine.range(line.from));
      if (log?.isError)
        ranges.push((number === error ? currentErrorLine : errorLine).range(line.from));
      if (!ansi || !log) continue;
      for (const span of log.spans) {
        const to = Math.min(span.to, line.length);
        const mark = to > span.from ? markOf(span) : null;
        if (mark) ranges.push(mark.range(line.from + span.from, line.from + to));
      }
    }

    for (let index = firstMatchFrom(matches, first - 1); index < matches.length; index += 1) {
      const found = matches[index];
      if (found.line > last - 1) break;
      const line = doc.line(found.line + 1);
      const end = Math.min(found.to, line.length);
      if (end > found.from) {
        ranges.push(
          (index === current ? currentMatch : match).range(line.from + found.from, line.from + end),
        );
      }
    }
    done = last;
  }

  return Decoration.set(ranges, true);
};

const decorations = (source: LogEditorSource, ansi: boolean) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, source, ansi);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || isRefresh(update)) {
          this.decorations = buildDecorations(update.view, source, ansi);
        }
      }
    },
    { decorations: plugin => plugin.decorations },
  );

class TextMarker extends GutterMarker {
  constructor(readonly text: string) {
    super();
  }

  override eq(other: GutterMarker) {
    return other instanceof TextMarker && other.text === this.text;
  }

  override toDOM() {
    return document.createTextNode(this.text);
  }
}

/**
 * The number of a line, as a link to it: a plain click marks it without a new page. CodeMirror
 * hides its gutters from assistive technology, so the link is out of the tab order; the URL with
 * `#L<line>` opens the same place.
 */
class LineLinkMarker extends GutterMarker {
  readonly href: string;

  constructor(
    readonly line: number,
    readonly source: LogEditorSource,
  ) {
    super();
    this.href = source.lineHref(line);
  }

  // The link follows the URL of the page: the node and the full screen are in it.
  override eq(other: GutterMarker) {
    return other instanceof LineLinkMarker && other.line === this.line && other.href === this.href;
  }

  override toDOM() {
    const link = document.createElement('a');
    link.className = 'cm-log-line-link';
    link.href = this.href;
    link.textContent = String(this.line);
    link.setAttribute('aria-label', this.source.lineLabel(this.line));
    link.tabIndex = -1;
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      this.source.onLineLink(this.line);
    });
    return link;
  }
}

class TimeMarker extends GutterMarker {
  constructor(
    readonly text: string,
    readonly title: string,
  ) {
    super();
  }

  override eq(other: GutterMarker) {
    return other instanceof TimeMarker && other.text === this.text && other.title === this.title;
  }

  override toDOM() {
    const time = document.createElement('span');
    time.textContent = this.text;
    time.title = this.title;
    return time;
  }
}

const lineNumberGutter = (source: LogEditorSource) =>
  gutter({
    class: 'cm-log-line-numbers',
    lineMarker: (view, block) =>
      new LineLinkMarker(view.state.doc.lineAt(block.from).number, source),
    lineMarkerChange: update => update.docChanged || isRefresh(update),
    initialSpacer: view => new TextMarker(String(view.state.doc.lines)),
    updateSpacer: (spacer, update) =>
      update.docChanged ? new TextMarker(String(update.view.state.doc.lines)) : spacer,
  });

const timestampGutter = (source: LogEditorSource) =>
  gutter({
    class: 'cm-log-timestamps',
    lineMarker: (view, block) => {
      const log = source.lines()[view.state.doc.lineAt(block.from).number - 1];
      if (!log?.timestamp) return null;
      const { text, title } = source.formatTime(log.timestamp);
      return new TimeMarker(text, title);
    },
    lineMarkerChange: update => update.docChanged,
    initialSpacer: () => new TextMarker('00:00:00'),
  });

/** The extensions of the log: read-only, the settings of the viewer, its marks and gutters. */
export const logEditorExtensions = (
  source: LogEditorSource,
  settings: LogDisplaySettings,
  showTimestamps: boolean,
): Extension[] => [
  EditorState.readOnly.of(true),
  EditorView.editable.of(false),
  logTheme(settings.size),
  settings.wrap ? EditorView.lineWrapping : [],
  settings.lineNumbers ? lineNumberGutter(source) : [],
  showTimestamps ? timestampGutter(source) : [],
  decorations(source, settings.ansi),
];

import type { JobLog } from '@base/features/jobs/domain/entities/job.entity.ts';
import { parseAnsiLine, type AnsiSpan, type AnsiState } from './ansi.presenter.ts';

/** A line of the log as the viewer shows it: the clean text, its styles, and if it is an error. */
export interface LogLine {
  nodeId: string;
  /** `stdout`, `stderr`, or empty when the server does not tell. */
  stream: string;
  /** ISO 8601. Empty when the server does not tell. */
  timestamp: string;
  /** The text as the agent read it, with its escape codes: the raw download. */
  raw: string;
  text: string;
  spans: AnsiSpan[];
  isError: boolean;
}

/**
 * A line that tells of an error: it starts with the word, it has a `…Error:` or `error:` part, or
 * it is a known form (npm, Rust, Python, GitHub Actions, the retry of the agent).
 */
const ERROR_PATTERNS: readonly RegExp[] = [
  /^\W*(error|fatal|failure|failed|fail|panic)\b/i,
  /\berror(\[[a-z]*\d+\])?:/i,
  /[a-z](Error|Exception):/,
  /\bFAILED\b/,
  /\bnpm ERR!/,
  /\bpanicked at\b/,
  /^Traceback \(most recent call last\)/,
  /^##\[error\]/,
  /\battempt \d+ failed\b/,
];

/**
 * Whether a line is an error: its text matches an error pattern, or it is written in red on the
 * error output (a tool that colors its errors with no word for them).
 */
export const isErrorLine = (line: Pick<LogLine, 'text' | 'stream' | 'spans'>): boolean => {
  if (ERROR_PATTERNS.some(pattern => pattern.test(line.text))) return true;
  return (
    line.stream === 'stderr' &&
    line.spans.some(span => span.fg === 'red' && line.text.slice(span.from, span.to).trim() !== '')
  );
};

/** Reads one line of the stream. `state` is the style that the line before of its node left open. */
export const readLogLine = (
  log: Pick<JobLog, 'nodeId' | 'stream' | 'timestamp' | 'line'>,
  state?: AnsiState,
): { line: LogLine; state: AnsiState } => {
  const parsed = parseAnsiLine(log.line, state);
  const base = {
    nodeId: log.nodeId,
    stream: log.stream,
    timestamp: log.timestamp,
    raw: log.line,
    text: parsed.line.text,
    spans: parsed.line.spans,
  };
  return { line: { ...base, isError: isErrorLine(base) }, state: parsed.state };
};

/** The indexes of the error lines, in order. */
export const errorLineIndexes = (lines: readonly Pick<LogLine, 'isError'>[]): number[] => {
  const indexes: number[] = [];
  lines.forEach((line, index) => {
    if (line.isError) indexes.push(index);
  });
  return indexes;
};

/** A match of the search: the index of its line, and its place in the text of the line. */
export interface LogMatch {
  line: number;
  from: number;
  to: number;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Each place of `query` in the clean text of the lines, case and accents as typed, in order. */
export const findLogMatches = (
  lines: readonly Pick<LogLine, 'text'>[],
  query: string,
): LogMatch[] => {
  if (!query) return [];
  const pattern = new RegExp(escapeRegExp(query), 'gi');
  const matches: LogMatch[] = [];
  lines.forEach(({ text }, line) => {
    pattern.lastIndex = 0;
    for (let found = pattern.exec(text); found; found = pattern.exec(text)) {
      matches.push({ line, from: found.index, to: found.index + found[0].length });
    }
  });
  return matches;
};

/** The text of a download: the clean text, or the raw text with its escape codes. */
export const logDownloadText = (
  lines: readonly Pick<LogLine, 'text' | 'raw'>[],
  raw: boolean,
): string => lines.map(line => (raw ? line.raw : line.text)).join('\n');

/** The number of a line in a link of the page: `#L150`, from 1. `null` for another hash. */
export const lineOfHash = (hash: string): number | null => {
  const found = /^#L(\d+)$/.exec(hash);
  const line = found ? Number(found[1]) : NaN;
  return Number.isSafeInteger(line) && line > 0 ? line : null;
};

export const hashOfLine = (line: number): string => `#L${line}`;

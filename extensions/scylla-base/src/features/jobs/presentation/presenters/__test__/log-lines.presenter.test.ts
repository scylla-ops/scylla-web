// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { JobLog } from '@base/features/jobs/domain/entities/job.entity.ts';
import {
  errorLineIndexes,
  findLogMatches,
  hashOfLine,
  isErrorLine,
  lineOfHash,
  logDownloadText,
  readLogLine,
} from '../log-lines.presenter.ts';

const ESC = '\x1b';

const log = (line: string, stream = 'stdout'): JobLog => ({
  id: '1',
  jobId: 'job-1',
  nodeId: 'build',
  stream,
  line,
  timestamp: '2026-01-01T00:00:00.000Z',
});

const read = (line: string, stream?: string) => readLogLine(log(line, stream)).line;

describe('isErrorLine', () => {
  it.each([
    'error: could not compile `scylla-core`',
    'Error: Cannot find module "vite"',
    'error[E0308]: mismatched types',
    'FATAL: password authentication failed',
    'TypeError: x is not a function',
    'test result: FAILED. 3 passed; 1 failed',
    'npm ERR! code ELIFECYCLE',
    "thread 'main' panicked at src/main.rs:2:5",
    'Traceback (most recent call last):',
    '##[error]Process completed with exit code 1.',
    'scylla-agent: attempt 2 failed: exit status 1',
    '  failed to fetch the repository',
  ])('finds the error in %j', text => {
    expect(isErrorLine({ text, stream: 'stdout', spans: [] })).toBe(true);
  });

  it.each([
    'Compiling scylla-core v0.7.0',
    'test result: ok. 12 passed; 0 failed',
    'no errors found',
    'warning: unused variable `x`',
    '0 failures',
  ])('finds no error in %j', text => {
    expect(isErrorLine({ text, stream: 'stdout', spans: [] })).toBe(false);
  });

  it('finds an error in a red line of the error output, not of the normal output', () => {
    expect(read(`${ESC}[31mexit code 2${ESC}[0m`, 'stderr').isError).toBe(true);
    expect(read(`${ESC}[31mexit code 2${ESC}[0m`, 'stdout').isError).toBe(false);
    expect(read('exit code 2', 'stderr').isError).toBe(false);
  });
});

describe('readLogLine', () => {
  it('keeps the raw text for the download, and gives the clean text and its styles', () => {
    expect(read(`${ESC}[32mok${ESC}[0m`)).toEqual({
      nodeId: 'build',
      stream: 'stdout',
      timestamp: '2026-01-01T00:00:00.000Z',
      raw: `${ESC}[32mok${ESC}[0m`,
      text: 'ok',
      spans: [{ from: 0, to: 2, fg: 'green' }],
      isError: false,
    });
  });
});

describe('errorLineIndexes', () => {
  it('gives the indexes of the error lines, in order', () => {
    const lines = ['ok', 'error: one', 'ok', 'FAILED two'].map(text => read(text));
    expect(errorLineIndexes(lines)).toEqual([1, 3]);
  });
});

describe('findLogMatches', () => {
  it('finds each place of the query in the clean text, with no case', () => {
    const lines = [read('Build ok'), read(`${ESC}[1mbuild${ESC}[0m again: BUILD`)];
    expect(findLogMatches(lines, 'build')).toEqual([
      { line: 0, from: 0, to: 5 },
      { line: 1, from: 0, to: 5 },
      { line: 1, from: 13, to: 18 },
    ]);
  });

  it('reads the query as text, not as a pattern', () => {
    expect(findLogMatches([read('a.b axb (c)')], 'a.b')).toEqual([{ line: 0, from: 0, to: 3 }]);
    expect(findLogMatches([read('a.b axb (c)')], '(c)')).toEqual([{ line: 0, from: 8, to: 11 }]);
  });

  it('finds nothing for an empty query', () => {
    expect(findLogMatches([read('anything')], '')).toEqual([]);
  });
});

describe('logDownloadText', () => {
  it('gives the clean text, or the raw text with its escape codes', () => {
    const lines = [read(`${ESC}[31mred${ESC}[0m`), read('plain')];
    expect(logDownloadText(lines, false)).toBe('red\nplain');
    expect(logDownloadText(lines, true)).toBe(`${ESC}[31mred${ESC}[0m\nplain`);
  });
});

describe('the link to a line', () => {
  it('reads the line of `#L150`, from 1', () => {
    expect(lineOfHash('#L150')).toBe(150);
    expect(lineOfHash(hashOfLine(7))).toBe(7);
  });

  it.each(['', '#', '#L0', '#L-1', '#Lx', '#L12a', '#section', 'L12'])(
    'gives no line for %j',
    hash => {
      expect(lineOfHash(hash)).toBeNull();
    },
  );
});

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { JobLog } from '@base/features/jobs/domain/entities/job.entity.ts';
import type { JobsRepository } from '@base/features/jobs/domain/repository/jobs.repository.ts';
import JobLogViewer from './JobLogViewer.fixture.svelte';

const ESC = '\x1b';
const PATHNAME = '/acme/projects/p1/pipelines/pipeline-1/jobs/job-1';

const logLine = (line: string, nodeId = 'build', stream = 'stdout'): JobLog => ({
  id: line,
  jobId: 'job-1',
  nodeId,
  stream,
  line,
  timestamp: '2026-01-01T00:00:00.000Z',
});

const streamOf = (lines: JobLog[]) => ({
  // eslint-disable-next-line @typescript-eslint/require-await
  logs: (async function* () {
    for (const line of lines) yield line;
  })(),
  cancel: vi.fn(),
});

let restore: (() => void) | null = null;
let navigator: ReturnType<typeof installTestNavigator>;

const install = (tailLogs: JobsRepository['tailLogs']) => {
  restore = withRegistry({ jobs: { jobsRepository: { tailLogs } as unknown as JobsRepository } });
};

const editor = () => document.querySelector<HTMLElement>('.cm-editor');
const content = () => document.querySelector<HTMLElement>('.cm-content');

/** Waits until the end of the stream wrote its lines. */
const linesShown = async (text: string) =>
  waitFor(() => expect(content()?.textContent).toContain(text));

// CodeMirror measures the text with a `Range`, which jsdom does not lay out.
beforeAll(() => {
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    value: () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }),
  });
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => new DOMRect(),
  });
  // The tail of a live log scrolls with `scrollTo`, which jsdom does not have.
  Object.defineProperty(Element.prototype, 'scrollTo', { configurable: true, value: () => {} });
});

afterAll(() => {
  Reflect.deleteProperty(Range.prototype, 'getClientRects');
  Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
  Reflect.deleteProperty(Element.prototype, 'scrollTo');
});

beforeEach(() => {
  restore = null;
  localStorage.clear();
  navigator = installTestNavigator({ pathname: PATHNAME, search: '?node=build' });
});

afterEach(() => {
  restore?.();
  navigator.restore();
  localStorage.clear();
});

describe('JobLogViewer', () => {
  it('writes the clean text of the lines, and shows their colors as marks', async () => {
    install(() => streamOf([logLine(`${ESC}[32mok${ESC}[0m first line`), logLine('second line')]));

    render(JobLogViewer, {});

    await linesShown('second line');
    expect(content()?.textContent).toContain('ok first line');
    expect(content()?.textContent).not.toContain('[32m');
    expect(document.querySelector('.ansi-green')).toHaveTextContent('ok');
  });

  it('adds the new lines of a live stream to the same editor', async () => {
    const queue: JobLog[] = [];
    let wake: () => void = () => {};
    install(() => ({
      logs: (async function* () {
        for (;;) {
          while (queue.length) yield queue.shift() as JobLog;
          await new Promise<void>(resolve => (wake = resolve));
        }
      })(),
      cancel: vi.fn(),
    }));
    const push = (line: string) => {
      queue.push(logLine(line));
      wake();
    };

    render(JobLogViewer, { isLive: true });
    push('first line');
    await linesShown('first line');
    const first = editor();

    push('second line');
    await linesShown('second line');
    push('third line');
    await linesShown('third line');

    // A new editor would lose the scroll and the follow of the tail.
    expect(editor()).toBe(first);
    expect(content()?.textContent).toContain('first line');
  });

  it('shows the lines of the chosen node only', async () => {
    install(() =>
      streamOf([logLine('compile', 'build'), logLine('run the tests', 'test'), logLine('link')]),
    );

    render(JobLogViewer, { nodeId: 'build' });

    await linesShown('link');
    expect(content()?.textContent).not.toContain('run the tests');
    expect(screen.getByText('2 lines')).toBeInTheDocument();
  });

  it('links each line number to its line, with the node of the page', async () => {
    install(() => streamOf([logLine('one'), logLine('two')]));

    render(JobLogViewer, { nodeId: 'build' });

    // CodeMirror hides its gutters from assistive technology.
    const link = await screen.findByRole('link', { name: 'Line 2', hidden: true });
    expect(link).toHaveAttribute('href', `${PATHNAME}?node=build#L2`);

    await userEvent.click(link);

    expect(navigator.navigate).toHaveBeenLastCalledWith(`${PATHNAME}?node=build#L2`, {
      replace: true,
    });
  });

  it('shows the colors as plain text, and no line number, when the settings say so', async () => {
    localStorage.setItem(
      'scylla.job-log.display',
      JSON.stringify({ ansi: false, lineNumbers: false }),
    );
    install(() => streamOf([logLine(`${ESC}[31mred${ESC}[0m line`)]));

    render(JobLogViewer, {});

    await linesShown('red line');
    expect(document.querySelector('.ansi-red')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Line 1', hidden: true })).not.toBeInTheDocument();
  });

  it('counts the errors of the log, and goes from one to the next with E and Shift+E', async () => {
    install(() =>
      streamOf([
        logLine('compile'),
        logLine('error: cannot find crate'),
        logLine('retry'),
        logLine('npm ERR! code 1'),
      ]),
    );

    render(JobLogViewer, {});

    await linesShown('npm ERR!');
    expect(screen.getByText('2 errors')).toBeInTheDocument();

    await userEvent.keyboard('e');
    expect(screen.getByText('Error 1 of 2')).toBeInTheDocument();
    expect(document.querySelector('.cm-log-error-current')).toHaveTextContent(
      'error: cannot find crate',
    );

    await userEvent.keyboard('e');
    expect(screen.getByText('Error 2 of 2')).toBeInTheDocument();

    await userEvent.keyboard('{Shift>}E{/Shift}');
    expect(screen.getByText('Error 1 of 2')).toBeInTheDocument();
  });

  it('opens the search with /, and counts the matches as the user types', async () => {
    install(() => streamOf([logLine('build one'), logLine('two'), logLine('Build three')]));

    render(JobLogViewer, {});

    await linesShown('Build three');
    await userEvent.keyboard('/');
    const search = screen.getByRole('searchbox', { name: 'Search the log' });
    expect(search).toHaveFocus();

    // In the field, a key is text, not a shortcut.
    await userEvent.keyboard('build');
    expect(search).toHaveValue('build');
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(document.querySelector('.cm-log-match-current')).toHaveTextContent('build');

    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('2 of 2')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(search).toHaveValue('');
  });

  it('says when nothing matches', async () => {
    install(() => streamOf([logLine('one line')]));

    render(JobLogViewer, {});

    await linesShown('one line');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search the log' }), 'nothing');

    expect(screen.getByText('No match')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next match' })).toBeDisabled();
  });

  it('opens the full screen with F, and closes it with Escape', async () => {
    install(() => streamOf([logLine('a line')]));
    const onFullscreenChange = vi.fn();

    const { rerender } = render(JobLogViewer, { onFullscreenChange });

    await linesShown('a line');
    await userEvent.keyboard('{Escape}');
    expect(onFullscreenChange).not.toHaveBeenCalled();

    await userEvent.keyboard('f');
    expect(onFullscreenChange).toHaveBeenLastCalledWith(true);

    await rerender({ onFullscreenChange, fullscreen: true });
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Escape',
    );
    await userEvent.keyboard('{Escape}');
    expect(onFullscreenChange).toHaveBeenLastCalledWith(false);
  });

  it('stops the wrap of the lines from its toggle, and keeps the choice', async () => {
    install(() => streamOf([logLine('a line')]));

    render(JobLogViewer, {});

    await linesShown('a line');
    const wrap = screen.getByRole('button', { name: 'Wrap the lines' });
    expect(wrap).toHaveAttribute('aria-pressed', 'true');
    expect(content()).toHaveClass('cm-lineWrapping');

    await userEvent.click(wrap);

    expect(wrap).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(content()).not.toHaveClass('cm-lineWrapping'));
    expect(JSON.parse(localStorage.getItem('scylla.job-log.display') ?? '{}')).toMatchObject({
      wrap: false,
    });
  });

  it('shows an error message when the stream could not be opened', async () => {
    install(() => {
      throw new ScyllaError('no stream');
    });

    render(JobLogViewer, {});

    expect(await screen.findByText('Error loading logs...')).toBeInTheDocument();
    expect(editor()).toBeNull();
  });

  it('keeps the lines and says so under them when the live tail stops', async () => {
    install(() => ({
      // eslint-disable-next-line @typescript-eslint/require-await
      logs: (async function* () {
        yield logLine('first line');
        throw new ScyllaError('gone', { code: 'UNAVAILABLE' });
      })(),
      cancel: vi.fn(),
    }));

    render(JobLogViewer, { isLive: true });

    expect(await screen.findByText(/^The live tail stopped\./)).toBeInTheDocument();
    expect(content()?.textContent).toContain('first line');
    expect(screen.queryByText('Error loading logs...')).not.toBeInTheDocument();
  });

  it('says that the log is live only while the job runs and the stream is open', async () => {
    install(() => ({ logs: (async function* () {})(), cancel: vi.fn() }));

    render(JobLogViewer, { isLive: true });

    expect(await screen.findByText('Ended')).toBeInTheDocument();
    expect(screen.queryByText('Streaming live output')).not.toBeInTheDocument();
  });

  it('says in the center of the panel that no log was written, for a stream with no line', async () => {
    install(() => streamOf([]));

    render(JobLogViewer, {});

    const empty = await screen.findByText('No log was written.');
    expect(empty).toHaveClass('items-center', 'justify-center', 'text-center');
    expect(editor()).toBeNull();
  });

  it('says why a node has no log in place of the editor', () => {
    install(() => streamOf([]));

    render(JobLogViewer, { nodeId: 'deploy', unavailable: 'It did not run.' });

    expect(screen.getByText('It did not run.')).toBeInTheDocument();
    expect(editor()).toBeNull();
  });
});

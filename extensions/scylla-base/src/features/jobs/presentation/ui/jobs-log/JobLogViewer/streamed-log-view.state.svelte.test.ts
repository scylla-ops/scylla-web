import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { EditorView } from '@codemirror/view';
import { createStreamedLogView, type LogSource } from './streamed-log-view.state.svelte.ts';

afterEach(() => vi.restoreAllMocks());

const linesOf = (...texts: string[]) => texts.map(text => ({ text }));

describe('createStreamedLogView', () => {
  it('opens a finished log on the end of its text, so all the rows of a wrapped last line show', () => {
    const scrollIntoView = vi.spyOn(EditorView, 'scrollIntoView');
    const lines = linesOf(
      'first line',
      'scylla-agent: git fetch --no-tags --depth=1 origin 054d6b539de355c9eb6e015b07ae7ce31fa604e1',
    );
    const text = lines.map(line => line.text).join('\n');
    const view = new EditorView({ parent: document.body });

    const cleanup = $effect.root(() => {
      createStreamedLogView(() => ({ key: '*', lines, count: lines.length })).attach(view);
    });
    flushSync();

    expect(view.state.doc.toString()).toBe(text);
    expect(scrollIntoView).toHaveBeenCalledWith(text.length, { y: 'end' });

    cleanup();
    view.destroy();
  });

  it('appends the new lines at the end of the document, and never writes it again', () => {
    const view = new EditorView({ parent: document.body });
    const dispatch = vi.spyOn(view, 'dispatch');

    const cleanup = $effect.root(() => {
      let source = $state<LogSource>({ key: '*', lines: linesOf('one'), count: 1 });
      createStreamedLogView(() => source).attach(view);
      flushSync();

      dispatch.mockClear();
      source = { key: '*', lines: linesOf('one', 'two', 'three'), count: 3 };
      flushSync();

      expect(view.state.doc.toString()).toBe('one\ntwo\nthree');
      expect(dispatch).toHaveBeenCalledWith({ changes: { from: 3, insert: '\ntwo\nthree' } });
    });

    cleanup();
    view.destroy();
  });

  it('writes the document of another node in place of the first one', () => {
    const view = new EditorView({ parent: document.body });

    const cleanup = $effect.root(() => {
      let source = $state<LogSource>({ key: '*', lines: linesOf('a', 'b'), count: 2 });
      createStreamedLogView(() => source).attach(view);
      flushSync();

      source = { key: 'node:build', lines: linesOf('b'), count: 1 };
      flushSync();

      expect(view.state.doc.toString()).toBe('b');
    });

    cleanup();
    view.destroy();
  });

  it('counts the lines that come while the reader does not follow, until it follows again', () => {
    const view = new EditorView({ parent: document.body });

    const cleanup = $effect.root(() => {
      let source = $state<LogSource>({ key: '*', lines: linesOf('a'), count: 1 });
      const stream = createStreamedLogView(() => source);
      stream.attach(view);
      flushSync();

      stream.unfollow();
      flushSync();
      expect(stream.isFollowing).toBe(false);
      expect(stream.newLines).toBe(0);

      source = { key: '*', lines: linesOf('a', 'b', 'c'), count: 3 };
      flushSync();
      expect(stream.newLines).toBe(2);

      stream.follow();
      flushSync();
      expect(stream.isFollowing).toBe(true);
      expect(stream.newLines).toBe(0);
    });

    cleanup();
    view.destroy();
  });

  it('follows the end again when another node opens', () => {
    const view = new EditorView({ parent: document.body });

    const cleanup = $effect.root(() => {
      let source = $state<LogSource>({ key: '*', lines: linesOf('a'), count: 1 });
      const stream = createStreamedLogView(() => source);
      stream.attach(view);
      flushSync();

      stream.unfollow();
      source = { key: 'node:test', lines: linesOf('t'), count: 1 };
      flushSync();

      expect(stream.isFollowing).toBe(true);
    });

    cleanup();
    view.destroy();
  });
});

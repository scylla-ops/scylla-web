import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { EditorView } from '@codemirror/view';
import { createStreamedLogView } from './streamed-log-view.state.svelte.ts';

afterEach(() => vi.restoreAllMocks());

describe('createStreamedLogView', () => {
  it('opens a finished log on the end of its text, so all the rows of a wrapped last line show', () => {
    const scrollIntoView = vi.spyOn(EditorView, 'scrollIntoView');
    const text =
      'first line\nscylla-agent: git fetch --no-tags --depth=1 origin 054d6b539de355c9eb6e015b07ae7ce31fa604e1';
    const view = new EditorView({ parent: document.body });

    const cleanup = $effect.root(() => {
      createStreamedLogView(() => text).attach(view);
    });
    flushSync();

    expect(view.state.doc.toString()).toBe(text);
    expect(scrollIntoView).toHaveBeenCalledWith(text.length, { y: 'end' });

    cleanup();
    view.destroy();
  });
});

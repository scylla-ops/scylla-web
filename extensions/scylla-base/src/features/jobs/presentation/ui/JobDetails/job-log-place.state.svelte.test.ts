import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { installTestNavigator } from '@test/navigator.ts';
import { createJobLogPlace } from './job-log-place.state.svelte.ts';

const NODES = ['build', 'test', 'deploy'];
const PATHNAME = '/acme/projects/p1/pipelines/pipe-1/jobs/job-1';

let navigator: ReturnType<typeof installTestNavigator>;

const openedWith = (search: string) => {
  navigator = installTestNavigator({ pathname: PATHNAME, search });
};

beforeEach(() => openedWith(''));
afterEach(() => navigator.restore());

const place = (nodeIds: readonly string[] = NODES) => createJobLogPlace(() => nodeIds);

const lastUrl = () => navigator.navigate.mock.calls.at(-1)?.[0];

describe('createJobLogPlace', () => {
  it('shows the whole job in a window when the URL tells nothing', () => {
    const cleanup = $effect.root(() => {
      const state = place();
      expect(state.nodeId).toBeNull();
      expect(state.fullscreen).toBe(false);
    });
    cleanup();
  });

  it('opens the node and the full screen of the URL, so a shared link opens the same view', () => {
    openedWith('?node=test&fullscreen=1');

    const cleanup = $effect.root(() => {
      const state = place();
      expect(state.nodeId).toBe('test');
      expect(state.fullscreen).toBe(true);
    });
    cleanup();
  });

  it('opens the first node of an old `?nodes=` link', () => {
    openedWith('?nodes=deploy,test');

    const cleanup = $effect.root(() => {
      expect(place().nodeId).toBe('test');
    });
    cleanup();
  });

  it('reads the nodes as they arrive, not the empty list of the first render', () => {
    openedWith('?node=build');

    const cleanup = $effect.root(() => {
      let nodeIds = $state<string[]>([]);
      const state = createJobLogPlace(() => nodeIds);
      expect(state.nodeId).toBeNull();

      nodeIds = NODES;
      flushSync();

      expect(state.nodeId).toBe('build');
    });
    cleanup();
  });

  it('writes the node in the URL in place of the page, and drops an old `nodes`', () => {
    openedWith('?nodes=build,test');

    const cleanup = $effect.root(() => {
      const state = place();
      state.select('deploy');
      flushSync();

      expect(lastUrl()).toBe(`${PATHNAME}?node=deploy`);
      expect(navigator.navigate).toHaveBeenLastCalledWith(`${PATHNAME}?node=deploy`, {
        replace: true,
      });
      expect(state.nodeId).toBe('deploy');
    });
    cleanup();
  });

  it('writes `all` for the whole job, so the link does not open an old node again', () => {
    openedWith('?node=build');

    const cleanup = $effect.root(() => {
      const state = place();
      state.select(null);
      flushSync();

      expect(lastUrl()).toBe(`${PATHNAME}?node=all`);
      expect(state.nodeId).toBeNull();
    });
    cleanup();
  });

  it('keeps the node and the other parameters when the full screen changes', () => {
    openedWith('?node=test&share=1');

    const cleanup = $effect.root(() => {
      const state = place();
      state.setFullscreen(true);
      flushSync();

      expect(lastUrl()).toBe(`${PATHNAME}?node=test&share=1&fullscreen=1`);
      expect(state.fullscreen).toBe(true);

      state.setFullscreen(false);
      flushSync();

      expect(lastUrl()).toBe(`${PATHNAME}?node=test&share=1`);
      expect(state.fullscreen).toBe(false);
    });
    cleanup();
  });

  it('does not write the URL again for the node or the full screen that it shows', () => {
    openedWith('?node=build&fullscreen=1');

    const cleanup = $effect.root(() => {
      const state = place();
      state.select('build');
      state.setFullscreen(true);
    });
    cleanup();

    expect(navigator.navigate).not.toHaveBeenCalled();
  });
});

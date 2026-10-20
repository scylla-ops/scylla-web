import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { createJobPanes, type JobPanes } from '../job-panes.svelte.ts';

const withPanes = (
  initial: string[],
  run: (panes: JobPanes, setIds: (ids: string[]) => void) => void,
) => {
  const cleanup = $effect.root(() => {
    let ids = $state(initial);
    const panes = createJobPanes(() => ids);
    flushSync();
    run(panes, next => {
      ids = next;
      flushSync();
    });
  });
  cleanup();
};

describe('createJobPanes', () => {
  it('shows the first job until a job is opened', () => {
    withPanes(['build', 'test'], panes => {
      expect(panes.panes).toEqual([{ tabs: ['build'], active: 'build' }]);
      expect(panes.focusedJob).toBe('build');
    });
  });

  it('shows the first job of the ids it is given, so the list order decides', () => {
    withPanes(['build', 'test'], (panes, setIds) => {
      setIds(['test', 'build']);
      expect(panes.focusedJob).toBe('test');
    });
  });

  it('keeps the shown job when the order of the ids changes after a pin', () => {
    withPanes(['a', 'b'], (panes, setIds) => {
      panes.pin();
      setIds(['b', 'a']);
      expect(panes.panes).toEqual([{ tabs: ['a'], active: 'a' }]);
    });
  });

  it('adds a tab to the focused pane and keeps the first job open', () => {
    withPanes(['build', 'test'], panes => {
      panes.open('test');
      expect(panes.panes).toEqual([{ tabs: ['build', 'test'], active: 'test' }]);
    });
  });

  it('opens a job to the side in a second pane, and focuses it', () => {
    withPanes(['build', 'test'], panes => {
      panes.openToSide('test');
      expect(panes.panes).toEqual([
        { tabs: ['build'], active: 'build' },
        { tabs: ['test'], active: 'test' },
      ]);
      expect(panes.focused).toBe(1);
      expect(panes.canSplit).toBe(false);
    });
  });

  it('opens to the side in the other pane when there are two already', () => {
    withPanes(['build', 'test', 'lint'], panes => {
      panes.openToSide('test');
      panes.focus(1);
      panes.openToSide('lint');
      expect(panes.panes[0]).toEqual({ tabs: ['build', 'lint'], active: 'lint' });
      expect(panes.focused).toBe(0);
    });
  });

  it('splits the focused job into a second pane', () => {
    withPanes(['build'], panes => {
      panes.split();
      expect(panes.panes).toEqual([
        { tabs: ['build'], active: 'build' },
        { tabs: ['build'], active: 'build' },
      ]);
    });
  });

  it('shows the tab before a closed active tab', () => {
    withPanes(['a', 'b', 'c'], panes => {
      panes.open('b');
      panes.open('c');
      panes.open('b');
      panes.close('b', 0);
      expect(panes.panes[0]).toEqual({ tabs: ['a', 'c'], active: 'a' });
    });
  });

  it('closes a second pane with no tab left', () => {
    withPanes(['a', 'b'], panes => {
      panes.openToSide('b');
      panes.close('b', 1);
      expect(panes.panes).toHaveLength(1);
      expect(panes.focused).toBe(0);
    });
  });

  it('keeps the first pane, empty, when its last tab closes', () => {
    withPanes(['a'], panes => {
      panes.close('a', 0);
      expect(panes.panes).toEqual([{ tabs: [], active: null }]);
      expect(panes.focusedJob).toBeNull();
    });
  });

  it('drops the tab of a job that leaves the document', () => {
    withPanes(['a', 'b'], (panes, setIds) => {
      panes.open('b');
      setIds(['a']);
      expect(panes.panes[0]).toEqual({ tabs: ['a'], active: 'a' });
    });
  });

  it('follows a rename in every pane', () => {
    withPanes(['a', 'b'], (panes, setIds) => {
      panes.openToSide('a');
      panes.rename('a', 'compile');
      setIds(['compile', 'b']);
      expect(panes.panes).toEqual([
        { tabs: ['compile'], active: 'compile' },
        { tabs: ['compile'], active: 'compile' },
      ]);
    });
  });
});

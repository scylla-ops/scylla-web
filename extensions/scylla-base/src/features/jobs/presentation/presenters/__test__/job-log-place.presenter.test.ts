// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { jobLogSearch, readJobLogPlace } from '../job-log-place.presenter.ts';

const NODES = ['.checkout', 'build', 'test', 'deploy'];

describe('readJobLogPlace', () => {
  it('shows the whole job in a window when the URL tells nothing', () => {
    expect(readJobLogPlace('', NODES)).toEqual({ nodeId: null, fullscreen: false });
  });

  it('reads the node and the full screen', () => {
    expect(readJobLogPlace('?node=test&fullscreen=1', NODES)).toEqual({
      nodeId: 'test',
      fullscreen: true,
    });
    expect(readJobLogPlace('?node=all', NODES)).toEqual({ nodeId: null, fullscreen: false });
  });

  it('shows the whole job for a node that the job does not have', () => {
    expect(readJobLogPlace('?node=ghost', NODES).nodeId).toBeNull();
  });

  it('opens the first node of an old `?nodes=` link, in the order of the list', () => {
    expect(readJobLogPlace('?nodes=deploy,build', NODES).nodeId).toBe('build');
    expect(readJobLogPlace('?nodes=.checkout', NODES).nodeId).toBe('.checkout');
    expect(readJobLogPlace('?nodes=ghost,test', NODES).nodeId).toBe('test');
    expect(readJobLogPlace('?nodes=ghost', NODES).nodeId).toBeNull();
  });

  it('prefers `node` to an old `nodes`', () => {
    expect(readJobLogPlace('?nodes=build&node=deploy', NODES).nodeId).toBe('deploy');
  });

  it('reads the query string with no hash', () => {
    expect(readJobLogPlace('?node=build&fullscreen=1#L12', NODES)).toEqual({
      nodeId: 'build',
      fullscreen: true,
    });
  });
});

describe('jobLogSearch', () => {
  it('writes the node, or `all` for the whole job, and drops an old `nodes`', () => {
    expect(jobLogSearch('?nodes=build,test', { nodeId: 'test' })).toBe('?node=test');
    expect(jobLogSearch('?node=test', { nodeId: null })).toBe('?node=all');
  });

  it('writes the full screen, and keeps the other parameters', () => {
    expect(jobLogSearch('?node=build&share=1', { fullscreen: true })).toBe(
      '?node=build&share=1&fullscreen=1',
    );
    expect(jobLogSearch('?node=build&fullscreen=1', { fullscreen: false })).toBe('?node=build');
    expect(jobLogSearch('?fullscreen=1', { fullscreen: false })).toBe('');
  });

  it('gives back a query string that reads as the same place', () => {
    const search = jobLogSearch('', { nodeId: 'deploy', fullscreen: true });
    expect(readJobLogPlace(search, NODES)).toEqual({ nodeId: 'deploy', fullscreen: true });
  });
});

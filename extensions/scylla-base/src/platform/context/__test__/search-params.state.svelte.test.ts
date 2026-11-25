import { afterEach, describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { installTestNavigator } from '@test/navigator.ts';
import { createSearchParams } from '../search-params.state.svelte.ts';

let restore = () => {};

afterEach(() => restore());

const withParams = (search: string, run: (params: ReturnType<typeof open>) => void) => {
  const navigator = installTestNavigator({ pathname: '/acme/marketplace/node-ci', search });
  restore = navigator.restore;
  const cleanup = $effect.root(() => {
    const params = open();
    flushSync();
    run(params);
  });
  cleanup();
  return navigator;
};

const open = () => createSearchParams(['tab', 'ref']);

describe('createSearchParams', () => {
  it('reads the parameters of a link, and gives an empty value for a missing one', () => {
    withParams('?tab=readme&period=7d', params => {
      expect(params.values).toEqual({ tab: 'readme', ref: '' });
    });
  });

  it('writes in place of the current entry, and keeps the other parameters', () => {
    const navigator = withParams('?period=7d', params => {
      params.write({ ref: 'branch:feature/bench' });

      expect(params.values).toEqual({ tab: '', ref: 'branch:feature/bench' });
    });

    expect(navigator.navigate).toHaveBeenCalledWith(
      '/acme/marketplace/node-ci?period=7d&ref=branch%3Afeature%2Fbench',
      { replace: true },
    );
  });

  it('removes a parameter with a blank value, and keeps the ones that the write does not name', () => {
    const navigator = withParams('?tab=readme&ref=tag:v1', params => {
      params.write({ tab: ' ' });

      expect(params.values).toEqual({ tab: '', ref: 'tag:v1' });
    });

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/marketplace/node-ci?ref=tag%3Av1', {
      replace: true,
    });
  });

  it('gives the bare path when no parameter is left', () => {
    const navigator = withParams('?tab=readme', params => params.write({ tab: '' }));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/marketplace/node-ci', { replace: true });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryObserver } from '@tanstack/query-core';
import {
  Extension,
  getQueryClient,
  setAppNavigator,
  setDependencyRegistry,
  setQueryClient,
} from '@scylla/core-sdk';
import TestFallback from '../routing/view/RouterView/fixtures/TestFallback.fixture.svelte';
import { setShellConfig } from '../shell/shell-config.ts';
import { startCore } from '../start-core.ts';

@Extension({
  id: 'test',
  name: 'Test',
  version: '1.0.0',
  modules: [{ id: 'frame', domain: {}, fallback: TestFallback }],
})
class TestExtension {}

const queryFn = vi.fn(() => Promise.resolve('value'));
let stopObserving: () => void;

beforeEach(async () => {
  queryFn.mockClear();
  const target = document.createElement('div');
  document.body.append(target);
  await startCore({ extensions: [TestExtension], target });

  const observer = new QueryObserver(getQueryClient(), { queryKey: ['active'], queryFn });
  stopObserving = observer.subscribe(() => {});
  await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
});

afterEach(() => {
  stopObserving();
  getQueryClient().unmount();
  setAppNavigator(null);
  setDependencyRegistry(null);
  setQueryClient(null);
  setShellConfig(null);
  document.body.innerHTML = '';
});

describe('startCore', () => {
  it('refetches an active query when the tab shows again', async () => {
    window.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
  });

  it('refetches an active query when the browser is online again', async () => {
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));

    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
  });
});

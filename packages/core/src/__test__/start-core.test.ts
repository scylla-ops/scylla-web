import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryObserver } from '@tanstack/query-core';
import {
  Extension,
  getQueryClient,
  setAppNavigator,
  setDependencyRegistry,
  setQueryClient,
} from '@scylla/core-sdk';
import { screen } from '@testing-library/svelte';
import TestFallback from '../routing/view/RouterView/fixtures/TestFallback.fixture.svelte';
import Stub from '../shell/__test__/Stub.fixture.svelte';
import { setShellConfig } from '../shell/shell-config.ts';
import { startCore } from '../start-core.ts';

@Extension({
  id: 'test',
  name: 'Test',
  version: '1.0.0',
  modules: [{ id: 'frame', domain: {}, fallback: TestFallback, shell: { appOverlays: [Stub] } }],
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
  it('renders the overlays of each page, on a page with no frame too', () => {
    expect(screen.getByText('stub')).toBeInTheDocument();
  });

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

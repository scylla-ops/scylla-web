import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { contextStore, workspaceQueries } from '@scylla/base-sdk';
import { RouterView, createAppRouter, loadExtensions, type AppRouterConfig } from '@scylla/core';
import { setAppNavigator } from '@scylla/core-sdk';
import { withQueryClient } from '@test/render.ts';
import { extensions } from '../extensions.ts';
import PassThroughLayout from './PassThroughLayout.fixture.svelte';
import PathnameGuard from './PathnameGuard.fixture.svelte';

/**
 * The real routes and the real router, from the URL that the person opens to the page. The
 * layout of the app (the session and the gate that loads the workspaces) and the guard of the
 * permissions are fixtures: the list of the workspaces is in the cache, as the gate leaves it.
 */

const { router } = loadExtensions(extensions);
const config: AppRouterConfig = {
  ...router,
  mounts: { ...router.mounts, app: { ...router.mounts.app, layout: PassThroughLayout } },
  shell: undefined,
  guard: PathnameGuard,
};

const workspace = (id: string, name: string, slug: string) => ({
  id,
  name,
  slug,
  personalTokensEnabled: true,
  timeZone: 'UTC',
});
const PERSONAL = workspace('ws-personal', 'Personal', 'personal');
const HOME = workspace('ws-home', "Scylla's home", 'scyllas-home');

let cache: ReturnType<typeof withQueryClient>;

/** Opens `url` in a new tab. Gives where the router stops, and each pathname where it put a page. */
const open = async (url: string): Promise<{ url: string; pages: string[] }> => {
  history.replaceState(null, '', url);
  setAppNavigator(createAppRouter(config));
  render(RouterView);
  const pages = await screen.findAllByTestId('page');
  return {
    url: `${window.location.pathname}${window.location.search}`,
    pages: pages.map(page => page.textContent?.trim() ?? ''),
  };
};

/** The router stops on `url`, and puts no page on the way. */
const only = (url: string) => ({ url, pages: [url.split('?')[0]] });

beforeEach(() => {
  cache = withQueryClient();
  cache.queryClient.setQueryData(workspaceQueries.mine().queryKey, [PERSONAL, HOME]);
  contextStore.setState({ workspace: { id: HOME.id, name: HOME.name, slug: HOME.slug } });
});

afterEach(() => {
  setAppNavigator(null);
  cache.restore();
});

describe('a URL with no workspace', () => {
  it('opens /marketplace in the active workspace, with no /dashboard after it', async () => {
    expect(await open('/marketplace')).toEqual(only('/scyllas-home/marketplace'));
    expect(contextStore.getState().workspace.slug).toBe('scyllas-home');
  });

  it('opens /library in the active workspace, with no /dashboard after it', async () => {
    expect(await open('/library')).toEqual(only('/scyllas-home/library'));
  });

  it('keeps the query string', async () => {
    expect(await open('/marketplace?q=helm')).toEqual(only('/scyllas-home/marketplace?q=helm'));
  });

  it('follows a redirect of the active workspace to its page', async () => {
    expect(await open('/access')).toEqual(only('/scyllas-home/access/members'));
  });

  it('opens the dashboard of the first workspace for a slug that is no workspace and no page', async () => {
    expect(await open('/no-such-workspace')).toEqual(only('/personal/dashboard'));
    expect(contextStore.getState().workspace.slug).toBe('personal');
  });
});

describe('a URL with a workspace', () => {
  it('stays on its page', async () => {
    expect(await open('/scyllas-home/marketplace')).toEqual(only('/scyllas-home/marketplace'));
  });

  it('opens the dashboard at the root of the workspace', async () => {
    expect(await open('/personal')).toEqual(only('/personal/dashboard'));
    expect(contextStore.getState().workspace.slug).toBe('personal');
  });
});

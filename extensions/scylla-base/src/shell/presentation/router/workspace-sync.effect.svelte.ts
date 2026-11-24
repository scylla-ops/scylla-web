import { untrack } from 'svelte';
import {
  currentPathname,
  currentSearch,
  hasPage,
  navigateTo,
  contextStore,
  workspaceUrl,
} from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { workspaceQueries } from '@base/features/workspace';
import { rememberWorkspace } from './last-workspace.ts';

const samePageAt = (oldSlug: string, newSlug: string): string =>
  `/${newSlug}${currentPathname().slice(oldSlug.length + 1)}${currentSearch()}`;

/**
 * A URL with no workspace, like `/marketplace`, reads its page as the slug. Returns the same URL
 * under the slug `target`, or `null` when the router has no page there.
 */
const pageUnder = (target: string): string | null => {
  const pathname = `/${target}${currentPathname()}`;
  return hasPage(pathname) ? `${pathname}${currentSearch()}` : null;
};

/**
 * Keeps the store equal to the list of the server, also when the list changes after the mount: a
 * rename reaches each reader of the store here. When no workspace matches the slug, goes to the
 * same page under the new slug of the active workspace, else to the first workspace. A URL with no
 * workspace keeps its page in the active workspace.
 *
 * `matched` stays `false` until the slug names a workspace of the person: until then the wrapper
 * renders no page and no redirect. Thus the redirect of the root of a workspace does not add
 * `/dashboard` to `/marketplace` before this effect reads the URL.
 */
export const syncWorkspace = (workspaceSlug: string | undefined): { readonly matched: boolean } => {
  const workspaces = createQuery(() => workspaceQueries.mine());
  let matched = $state(false);

  $effect(() => {
    const list = workspaces.data;
    if (!workspaceSlug || workspaces.isLoading || !list) return;

    untrack(() => {
      const store = contextStore.getState();
      const { workspace } = store;
      const match = list.find(item => item.slug === workspaceSlug);

      if (match) {
        rememberWorkspace(match.id);
        if (match.id !== workspace.id) store.setWorkspace(match.id, match.name, match.slug);
        else if (match.name !== workspace.name || match.slug !== workspace.slug)
          store.renameWorkspace(match.name, match.slug);
        matched = true;
        return;
      }

      const renamed =
        workspace.slug === workspaceSlug ? list.find(item => item.id === workspace.id) : undefined;
      if (renamed) {
        store.renameWorkspace(renamed.name, renamed.slug);
        navigateTo(samePageAt(workspaceSlug, renamed.slug), { replace: true });
        return;
      }

      const fallback = list[0];
      if (!fallback) return;

      // No workspace in the URL: the page stays, in the workspace that the person uses now.
      const current = list.find(item => item.id === workspace.id) ?? fallback;
      const samePage = pageUnder(current.slug);
      navigateTo(samePage ?? workspaceUrl(fallback.slug), { replace: true });
      const target = samePage ? current : fallback;
      store.setWorkspace(target.id, target.name, target.slug);
    });
  });

  return {
    get matched() {
      return matched;
    },
  };
};

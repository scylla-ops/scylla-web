import { contextStore, workspaceUrl } from '@platform/context';
import { createQuery } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toRune } from '@scylla/ui/stores';
import { workspaceQueries } from '@base/features/workspace';
import { lastWorkspaceId } from '@base/shell/presentation/router/last-workspace.ts';
import { layoutMessages } from './messages/layout.messages.ts';

/** The last page of a workspace that this tab showed. */
let lastPage: { slug: string; href: string } | null = null;

/** The shell calls it on each page of a workspace. */
export const rememberWorkspacePage = (slug: string, href: string): void => {
  lastPage = { slug, href };
};

/**
 * The way out of the administration of the server: the last page of the active workspace, else
 * the dashboard of the workspace that `/` opens. With no workspace, `/` shows the choice of one.
 * Create it during component initialisation.
 */
export const createAdminExit = () => {
  const workspaces = createQuery(() => workspaceQueries.mine());
  const context = toRune(contextStore);

  const target = $derived.by(() => {
    const { name, slug } = context().workspace;
    if (name && slug) return { name, slug };
    const list = workspaces.data ?? [];
    return list.find(item => item.id === lastWorkspaceId()) ?? list[0];
  });

  return {
    get label(): string {
      return target ? t(layoutMessages.backTo(target.name)) : t(layoutMessages.back);
    },
    get href(): string {
      if (!target) return '/';
      return lastPage?.slug === target.slug ? lastPage.href : workspaceUrl(target.slug);
    },
  };
};

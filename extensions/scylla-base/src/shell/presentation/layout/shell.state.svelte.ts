import { navigateTo, contextStore, workspaceUrl } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import type { FormValues } from '@scylla/ui';
import { workspaceMutations, workspaceQueries } from '@base/features/workspace';
import { syncMyPermissions } from '@base/features/access';

/** Loads the user's workspaces and keeps the permissions in sync with the context. Create it once, in `Layout`. */
export const createShell = () => {
  const workspaces = createQuery(() => workspaceQueries.mine());
  const createWorkspace = createMutation(() => workspaceMutations.create());
  const context = toRune(contextStore);

  $effect(() => {
    const { workspace, project } = context();
    syncMyPermissions(workspace.id, project.id);
  });

  return {
    get isLoading() {
      return workspaces.isLoading;
    },
    get hasWorkspaces() {
      return (workspaces.data?.length ?? 0) > 0;
    },
    get isCreating() {
      return createWorkspace.isPending;
    },
    createFirstWorkspace: ({ name, slug }: FormValues<'name' | 'slug'>) => {
      if (!name.trim()) return;

      createWorkspace.mutate(
        { name: name.trim(), slug: slug.trim() || undefined },
        { onSuccess: workspace => navigateTo(workspaceUrl(workspace.slug)) },
      );
    },
  };
};

export type Shell = ReturnType<typeof createShell>;

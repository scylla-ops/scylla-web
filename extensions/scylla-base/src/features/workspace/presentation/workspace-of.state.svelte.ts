import { createQuery } from '@scylla/core-sdk';
import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';
import { workspaceQueries } from './workspace.queries.ts';

/**
 * The workspace of an id: from the list of the person, else from the server. An instance admin
 * opens the workspaces of other users, and these are not in `mine`.
 */
export const createWorkspaceOf = (workspaceId: () => string | null) => {
  const mine = createQuery(() => workspaceQueries.mine());
  const own = $derived(mine.data?.find(item => item.id === workspaceId()));
  const other = createQuery(() =>
    workspaceQueries.byId(workspaceId(), { enabled: !!mine.data && !own }),
  );

  return {
    get workspace(): WorkspaceEntity | undefined {
      return own ?? other.data;
    },
    get isPending(): boolean {
      return mine.isPending || (!own && other.isLoading);
    },
    get isError(): boolean {
      return mine.isError;
    },
    get error(): Error | null {
      return mine.error;
    },
  };
};

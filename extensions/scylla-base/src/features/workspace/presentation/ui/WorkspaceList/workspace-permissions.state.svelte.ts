import { createQueries } from '@scylla/core-sdk';
import { canAccess, type EffectiveScope, type Permission } from '@platform/authz';
import { accessQueries, workspaceRef } from '@base/features/access';

type ScopeResult = { data?: EffectiveScope };

/** What the user can do on each row. A row can be any workspace, and `can()` knows only the active one. */
export const createWorkspacePermissions = (workspaceIds: () => readonly string[]) => {
  const results = createQueries(() => ({
    queries: workspaceIds().map(id => accessQueries.myScope(workspaceRef(id))),
  }));

  const effective = $derived({
    scopes: ([...results] as ScopeResult[]).flatMap(({ data }) => (data ? [data] : [])),
  });

  return {
    can: (permission: Permission, workspaceId: string): boolean =>
      canAccess(effective, permission, { workspaceId }),
  };
};

import { createQuery } from '@scylla/core-sdk';
import { contextStore } from '@platform/context';
import type { EntityIconProps } from '@scylla/ui';
import { toRune } from '@scylla/ui/stores';
import type { MemberRoleEntity } from '@base/features/access';
import { projectIconProps, projectQueries } from '@base/features/project';
import { workspaceIconProps, workspaceQueries } from '@base/features/workspace';

const context = toRune(contextStore);

/**
 * The icon of a scope that a page names, as the switcher and the project cards show it. It reads
 * the lists that they cache: the workspaces of the reader, the projects of the open workspace.
 * `undefined` while they load, with no id, or for a scope out of these lists: the label keeps the
 * glyph of its kind.
 */
export const createScopeIcon = (
  kind: () => MemberRoleEntity['scopeKind'],
  id: () => string | undefined,
) => {
  const workspaces = createQuery(() => ({
    ...workspaceQueries.mine(),
    enabled: kind() === 'workspace' && !!id(),
  }));
  const projects = createQuery(() =>
    projectQueries.lookup(kind() === 'project' && id() ? context().workspace.id : null),
  );

  const props = $derived.by((): EntityIconProps | undefined => {
    const scopeId = id();
    if (!scopeId) return undefined;
    if (kind() === 'workspace') {
      const workspace = workspaces.data?.find(item => item.id === scopeId);
      return workspace && workspaceIconProps(workspace.icon);
    }
    const project = projects.data?.items.find(item => item.id === scopeId);
    return project && projectIconProps(project.icon);
  });

  return {
    get props() {
      return props;
    },
  };
};

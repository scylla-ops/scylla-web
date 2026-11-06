import { msg } from '@lingui/core/macro';
import ShieldPlusIcon from '@lucide/svelte/icons/shield-plus';
import { Permission } from '@platform/authz';
import { routeParams, type CreateCommand } from '@scylla/core-sdk';

const inWorkspace = (path: string): string | null => {
  const { workspaceSlug } = routeParams();
  return workspaceSlug ? `/${workspaceSlug}/${path}` : null;
};

export const rolesCommands: readonly CreateCommand[] = [
  {
    id: 'roles.create-workspace',
    kind: 'create',
    title: msg`New workspace role`,
    keywords: msg`create add permissions`,
    icon: ShieldPlusIcon,
    permission: Permission.MANAGE_WORKSPACE_ROLES,
    form: { path: () => inWorkspace('access/roles/new') },
  },
  {
    id: 'roles.create-instance',
    kind: 'create',
    title: msg`New instance role`,
    keywords: msg`create add permissions`,
    icon: ShieldPlusIcon,
    permission: Permission.MANAGE_ROLES,
    form: { path: () => inWorkspace('instance/roles/new') },
  },
];

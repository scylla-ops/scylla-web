import { msg } from '@lingui/core/macro';
import Building2Icon from '@lucide/svelte/icons/building-2';
import { Permission } from '@platform/authz';
import type { CreateCommand } from '@scylla/core-sdk';

export const workspaceCommands: readonly CreateCommand[] = [
  {
    id: 'workspace.create',
    kind: 'create',
    title: msg`New workspace`,
    keywords: msg`create add organization`,
    icon: Building2Icon,
    permission: Permission.CREATE_WORKSPACE,
    form: { load: () => import('./ui/AddWorkspaceDialog/AddWorkspaceDialog.svelte') },
  },
];

import { msg } from '@lingui/core/macro';
import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
import { Permission } from '@platform/authz';
import type { CreateCommand } from '@scylla/core-sdk';

export const projectCommands: readonly CreateCommand[] = [
  {
    id: 'project.create',
    kind: 'create',
    title: msg`New project`,
    keywords: msg`create add`,
    icon: FolderPlusIcon,
    permission: Permission.CREATE_PROJECT,
    form: { load: () => import('./ui/AddProjectDialog.svelte') },
  },
];

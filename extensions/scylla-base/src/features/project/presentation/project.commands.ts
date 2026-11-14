import { msg } from '@lingui/core/macro';
import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
import { Permission } from '@platform/authz';
import { routeParams, type CreateCommand } from '@scylla/core-sdk';

const newProject = (): string | null => {
  const { workspaceSlug } = routeParams();
  return workspaceSlug ? `/${workspaceSlug}/projects/new` : null;
};

export const projectCommands: readonly CreateCommand[] = [
  {
    id: 'project.create',
    kind: 'create',
    title: msg`New project`,
    keywords: msg`create add`,
    icon: FolderPlusIcon,
    permission: Permission.CREATE_PROJECT,
    form: { path: newProject },
  },
];

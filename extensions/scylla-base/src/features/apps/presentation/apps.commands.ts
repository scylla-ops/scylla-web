import { msg } from '@lingui/core/macro';
import BlocksIcon from '@lucide/svelte/icons/blocks';
import ServerIcon from '@lucide/svelte/icons/server';
import { Permission } from '@platform/authz';
import { contextStore } from '@platform/context';
import { commandForm, type CreateCommand } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';

const context = toRune(contextStore);

export const appsCommands: readonly CreateCommand[] = [
  {
    id: 'apps.create-agent',
    kind: 'create',
    title: msg`New agent`,
    keywords: msg`create add connect runner machine`,
    icon: ServerIcon,
    permission: Permission.CREATE_APP,
    available: () => !!context().workspace.id,
    form: commandForm({
      load: () => import('./ui/components/AddAgentDialog/AddAgentDialog.svelte'),
      props: () => ({ workspaceId: context().workspace.id ?? '' }),
    }),
  },
  {
    id: 'apps.create-app',
    kind: 'create',
    title: msg`New app`,
    keywords: msg`create add application machine`,
    icon: BlocksIcon,
    permission: Permission.CREATE_APP,
    available: () => !!context().workspace.id,
    form: commandForm({
      load: () => import('./ui/components/AddAppDialog/AddAppDialog.svelte'),
      props: () => ({
        workspaceId: context().workspace.id ?? '',
        workspaceName: context().workspace.name ?? '',
      }),
    }),
  },
];

import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import Building2Icon from '@lucide/svelte/icons/building-2';
import SettingsIcon from '@lucide/svelte/icons/settings';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { AccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import { WorkspaceServiceClient } from '@base/generated/scylla/workspaces/v1/workspace_service.client.ts';
import { DefaultWorkspaceRepository } from './infrastructure/default-workspace.repository.ts';
import { workspaceCommands } from './presentation/workspace.commands.ts';

const transport = grpcTransport.getTransport();
const workspaceRepository = new DefaultWorkspaceRepository(
  new WorkspaceServiceClient(transport),
  new AccessServiceClient(transport),
);

/**
 * The settings page, and the list of all the workspaces in the administration. The workspace
 * switcher of the shell and other features read its queries.
 */
export const WorkspaceModule = {
  id: 'workspace',
  domain: {
    workspaceRepository: workspaceRepository,
  },
  commands: workspaceCommands,
  routes: {
    admin: [
      {
        path: 'workspaces',
        permission: Permission.LIST_ALL_WORKSPACES,
        breadcrumb: () => ({ label: msg`Workspaces` }),
        page: () => import('./presentation/ui/WorkspaceAdmin/WorkspaceAdmin.page.svelte'),
        nav: {
          section: 'instance',
          title: msg`Workspaces`,
          keywords: msg`workspaces owners personal`,
          icon: Building2Icon,
          order: 15,
        },
      },
    ],
    workspace: [
      {
        permission: Permission.UPDATE_WORKSPACE,
        path: 'settings',
        breadcrumb: () => ({ label: msg`Settings` }),
        page: () => import('./presentation/ui/WorkspaceSettings/WorkspaceSettings.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`General`,
          keywords: msg`workspace settings name`,
          icon: SettingsIcon,
          order: 60,
          group: { id: 'settings', title: msg`Settings`, icon: SettingsIcon },
        },
      },
    ],
  },
} satisfies ScyllaModule;

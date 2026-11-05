import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import SettingsIcon from '@lucide/svelte/icons/settings';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { AccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import { WorkspaceServiceClient } from '@base/generated/scylla/workspaces/v1/workspace_service.client.ts';
import { DefaultWorkspaceRepository } from './infrastructure/default-workspace.repository.ts';

const transport = grpcTransport.getTransport();
const workspaceRepository = new DefaultWorkspaceRepository(
  new WorkspaceServiceClient(transport),
  new AccessServiceClient(transport),
);

/** The settings page; the workspace switcher of the shell and other features read its queries. */
export const WorkspaceModule = {
  id: 'workspace',
  domain: {
    workspaceRepository: workspaceRepository,
  },
  routes: {
    workspace: [
      {
        permission: Permission.UPDATE_WORKSPACE,
        path: 'settings',
        breadcrumb: () => ({ label: msg`Settings` }),
        page: () => import('./presentation/ui/WorkspaceSettings/WorkspaceSettings.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`General`,
          icon: SettingsIcon,
          order: 60,
          group: { id: 'settings', title: msg`Settings`, icon: SettingsIcon },
        },
      },
    ],
  },
} satisfies ScyllaModule;

import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { TriggerServiceClient } from '@base/generated/scylla/pipelines/v1/trigger_service.client.ts';
import { DefaultTriggersRepository } from './infrastructure/default-triggers.repository.ts';
import { triggersCommands } from './presentation/triggers.commands.ts';

const triggersRepository = new DefaultTriggersRepository(
  new TriggerServiceClient(grpcTransport.getTransport()),
  // At call time: the module loads in node too, with no window.
  () => import.meta.env.VITE_API_URL || window.location.origin,
);

export const TriggersModule = {
  id: 'triggers',
  domain: {
    triggersRepository: triggersRepository,
  },
  commands: triggersCommands,
  routes: {
    project: [
      {
        // The crumb of `pipelines/:pipelineId` names the pipeline before it.
        path: 'pipelines/:pipelineId/triggers',
        permission: Permission.MANAGE_TRIGGERS,
        breadcrumb: () => ({ label: msg`Triggers` }),
        page: () => import('./presentation/ui/Triggers/Triggers.page.svelte'),
        children: [
          {
            path: 'new',
            permission: Permission.MANAGE_TRIGGERS,
            breadcrumb: () => ({ label: msg`New trigger` }),
            page: () => import('./presentation/ui/TriggerEditor/TriggerEditor.page.svelte'),
          },
          {
            path: ':triggerId/edit',
            permission: Permission.MANAGE_TRIGGERS,
            breadcrumb: () => ({ label: msg`Edit trigger` }),
            page: () => import('./presentation/ui/TriggerEditor/TriggerEditor.page.svelte'),
          },
        ],
      },
    ],
  },
} satisfies ScyllaModule;

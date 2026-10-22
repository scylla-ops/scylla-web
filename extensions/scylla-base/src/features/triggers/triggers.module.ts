import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { TriggerServiceClient } from '@base/generated/scylla/trigger/v1/trigger.client.ts';
import { DefaultTriggersRepository } from './infrastructure/default-triggers.repository.ts';

const triggersRepository = new DefaultTriggersRepository(
  new TriggerServiceClient(grpcTransport.getTransport()),
);

export const TriggersModule = {
  id: 'triggers',
  domain: {
    triggersRepository: triggersRepository,
  },
  routes: {
    project: [
      {
        path: 'pipelines/:pipelineId/triggers',
        permission: Permission.MANAGE_TRIGGERS,
        breadcrumb: ({ pipelineName }) => ({
          label: msg`Pipeline`,
          highlight: pipelineName,
          detail: msg`Triggers`,
        }),
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

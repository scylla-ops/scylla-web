import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { SecretServiceClient } from '@base/generated/scylla/projects/v1/secret_service.client.ts';
import { PipelineServiceClient } from '@base/generated/scylla/pipelines/v1/pipeline_service.client.ts';
import { DefaultSecretRepository } from './infrastructure/default-secret.repository.ts';
import { secretCommands } from './presentation/secret.commands.ts';

const secretRepository = new DefaultSecretRepository(
  new SecretServiceClient(grpcTransport.getTransport()),
  new PipelineServiceClient(grpcTransport.getTransport()),
);

export const SecretModule = {
  id: 'secret',
  domain: {
    secretRepository,
  },
  commands: secretCommands,
  routes: {
    project: [
      {
        path: 'secrets',
        permission: Permission.LIST_SECRETS,
        breadcrumb: () => ({ label: msg`Secrets` }),
        page: () => import('./presentation/ui/Secret.page.svelte'),
        nav: { section: 'project', title: msg`Secrets`, icon: KeyRoundIcon, order: 20 },
      },
    ],
  },
} satisfies ScyllaModule;

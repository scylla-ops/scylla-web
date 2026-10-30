import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { SecretServiceClient } from '@base/generated/scylla/secret/v1/secret.client.ts';
import { PipelineServiceClient } from '@base/generated/scylla/pipeline/v1/pipeline.client.ts';
import { DefaultSecretRepository } from './infrastructure/default-secret.repository.ts';

const secretRepository = new DefaultSecretRepository(
  new SecretServiceClient(grpcTransport.getTransport()),
  new PipelineServiceClient(grpcTransport.getTransport()),
);

export const SecretModule = {
  id: 'secret',
  domain: {
    secretRepository,
  },
  routes: {
    project: [
      {
        path: 'secrets',
        permission: Permission.LIST_SECRETS,
        breadcrumb: () => ({ label: msg`Secrets` }),
        page: () => import('./presentation/ui/Secret.page.svelte'),
      },
    ],
  },
} satisfies ScyllaModule;

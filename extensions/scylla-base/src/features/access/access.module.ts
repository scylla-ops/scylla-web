import type { ScyllaModule } from '@scylla/core-sdk';
import { grpcTransport } from '@platform/grpc';
import { AccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import { DefaultAccessRepository } from './infrastructure/default-access.repository.ts';

const accessRepository = new DefaultAccessRepository(
  new AccessServiceClient(grpcTransport.getTransport()),
);

/** No page: the roles are fixed. The members pages and the permission store use it. */
export const AccessModule = {
  id: 'access',
  domain: {
    accessRepository,
  },
} satisfies ScyllaModule;

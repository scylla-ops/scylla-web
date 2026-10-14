import type { ScyllaModule } from '@scylla/core-sdk';
import { grpcTransport } from '@platform/grpc';
import { OrganizationServiceClient } from '@base/generated/scylla/organization/v1/organization.client.ts';
import { DefaultOrganizationRepository } from './infrastructure/default-organization.repository.ts';

const organizationRepository = new DefaultOrganizationRepository(
  new OrganizationServiceClient(grpcTransport.getTransport()),
);

/** No page: the organization switcher of the shell and the other features read its queries. */
export const OrganizationModule = {
  id: 'organization',
  domain: {
    organizationRepository: organizationRepository,
  },
} satisfies ScyllaModule;

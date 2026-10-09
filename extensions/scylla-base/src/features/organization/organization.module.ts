import type { ScyllaModule } from '@scylla/core-sdk';
import DefaultOrganizationRepository from '@base/features/organization/infrastructure/repository/default-organization.repository.ts';
import GrpcOrganizationRemoteDataSource from '@base/features/organization/infrastructure/data/grpc-organization-remote.data-source.ts';
import { grpcTransport } from '@platform/grpc';

const organizationRemoteDataSource = new GrpcOrganizationRemoteDataSource(grpcTransport);

const organizationRepository = new DefaultOrganizationRepository(organizationRemoteDataSource);

/** No page: the organization switcher of the shell and the other features read its queries. */
export const OrganizationModule = {
  id: 'organization',
  domain: {
    organizationRepository: organizationRepository,
  },
} satisfies ScyllaModule;

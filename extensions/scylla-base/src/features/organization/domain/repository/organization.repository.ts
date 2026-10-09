import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { UserSummary } from '@base/features/user';
import type { OrganizationEntity } from '@base/features/organization/domain/entities/organization.entity.ts';

export interface OrganizationRepository {
  getAll(): Promise<ScyllaResult<OrganizationEntity[]>>;
  getMine(): Promise<ScyllaResult<OrganizationEntity[]>>;
  listMembers(organizationId: string): Promise<ScyllaResult<UserSummary[]>>;
  create: (name: string, description?: string) => Promise<ScyllaResult<OrganizationEntity>>;
  update: (
    organizationId: string,
    name?: string,
    description?: string,
  ) => Promise<ScyllaResult<OrganizationEntity>>;
  delete: (organizationId: string) => Promise<ScyllaResult<void>>;
}

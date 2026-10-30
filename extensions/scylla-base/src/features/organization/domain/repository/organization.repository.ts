import type { UserSummary } from '@base/features/user';
import type { OrganizationEntity } from '@base/features/organization/domain/entities/organization.entity.ts';

export interface OrganizationRepository {
  getAll(): Promise<OrganizationEntity[]>;
  getMine(): Promise<OrganizationEntity[]>;
  listMembers(organizationId: string): Promise<UserSummary[]>;
  create: (name: string, description?: string) => Promise<OrganizationEntity>;
  update: (
    organizationId: string,
    name?: string,
    description?: string,
  ) => Promise<OrganizationEntity>;
  delete: (organizationId: string) => Promise<void>;
}

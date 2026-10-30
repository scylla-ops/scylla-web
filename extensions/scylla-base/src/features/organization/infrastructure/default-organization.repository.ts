import type { OrganizationRepository } from '@base/features/organization/domain/repository/organization.repository.ts';
import type { OrganizationEntity } from '@base/features/organization/domain/entities/organization.entity.ts';
import type { IOrganizationServiceClient } from '@base/generated/scylla/organization/v1/organization.client.ts';
import type { Organization } from '@base/generated/scylla/organization/v1/organization.ts';
import type { UserSummary } from '@base/features/user';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcOrganization from './grpc-organization.mapper.ts';
import * as grpcOrganizationMember from './grpc-organization-member.mapper.ts';

/** The server always fills it on success: an absent one is a protocol error. */
const requireOrganization = (organization?: Organization): OrganizationEntity => {
  if (!organization) throw new Error('Server returned no organization.');
  return grpcOrganization.toDomain(organization);
};

export class DefaultOrganizationRepository implements OrganizationRepository {
  constructor(private readonly client: IOrganizationServiceClient) {}

  public async getAll(): Promise<OrganizationEntity[]> {
    const response = await this.client.listOrganizations({}).response;
    return response.organizations.map(grpcOrganization.toDomain);
  }

  // The organizations of the current user: non-admins may not list them all.
  public async getMine(): Promise<OrganizationEntity[]> {
    const userId = localStorage.getItem('userId') ?? '';
    const response = await this.client.listUserOrganizations({ userId: wrapId(userId) }).response;
    return response.organizations.map(grpcOrganization.toDomain);
  }

  /** Derived from grants: also lists people holding only a project grant in the organization. */
  public async listMembers(organizationId: string): Promise<UserSummary[]> {
    const response = await this.client.listOrganizationMembers({
      organizationId: wrapId(organizationId),
    }).response;
    return response.members.map(grpcOrganizationMember.toDomain);
  }

  public async create(name: string, description?: string): Promise<OrganizationEntity> {
    const response = await this.client.createOrganization({ name, description }).response;
    return requireOrganization(response.organization);
  }

  public async update(
    organizationId: string,
    name?: string,
    description?: string,
  ): Promise<OrganizationEntity> {
    const response = await this.client.updateOrganization({
      organizationId: wrapId(organizationId),
      name,
      description,
    }).response;
    return requireOrganization(response.organization);
  }

  public async delete(organizationId: string): Promise<void> {
    await this.client.deleteOrganization({ organizationId: wrapId(organizationId) }).response;
  }
}

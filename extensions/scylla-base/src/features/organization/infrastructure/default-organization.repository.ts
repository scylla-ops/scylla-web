import type { OrganizationRepository } from '@base/features/organization/domain/repository/organization.repository.ts';
import type { OrganizationEntity } from '@base/features/organization/domain/entities/organization.entity.ts';
import type { IOrganizationServiceClient } from '@base/generated/scylla/organization/v1/organization.client.ts';
import type { Organization } from '@base/generated/scylla/organization/v1/organization.ts';
import type { UserSummary } from '@base/features/user';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import { GrpcOrganizationMapper } from './grpc-organization.mapper.ts';
import { GrpcOrganizationMemberMapper } from './grpc-organization-member.mapper.ts';

/** The server always fills it on success: an absent one is a protocol error. */
const requireOrganization = (organization?: Organization): OrganizationEntity => {
  if (!organization) throw new Error('Server returned no organization.');
  return GrpcOrganizationMapper.toDomain(organization);
};

export class DefaultOrganizationRepository implements OrganizationRepository {
  constructor(private readonly client: IOrganizationServiceClient) {}

  public getAll(): Promise<ScyllaResult<OrganizationEntity[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listOrganizations({}).response;
      return response.organizations.map(GrpcOrganizationMapper.toDomain);
    }, 'Failed to fetch organizations.');
  }

  // The organizations of the current user: non-admins may not list them all.
  public getMine(): Promise<ScyllaResult<OrganizationEntity[]>> {
    return ScyllaResult.tryAsync(async () => {
      const userId = localStorage.getItem('userId') ?? '';
      const response = await this.client.listUserOrganizations({ userId: wrapId(userId) }).response;
      return response.organizations.map(GrpcOrganizationMapper.toDomain);
    }, 'Failed to fetch organizations.');
  }

  /** Derived from grants: also lists people holding only a project grant in the organization. */
  public listMembers(organizationId: string): Promise<ScyllaResult<UserSummary[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listOrganizationMembers({
        organizationId: wrapId(organizationId),
      }).response;
      return response.members.map(GrpcOrganizationMemberMapper.toDomain);
    }, 'Failed to fetch organization members.');
  }

  public create(name: string, description?: string): Promise<ScyllaResult<OrganizationEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.createOrganization({ name, description }).response;
      return requireOrganization(response.organization);
    }, 'Failed to create organization.');
  }

  public update(
    organizationId: string,
    name?: string,
    description?: string,
  ): Promise<ScyllaResult<OrganizationEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.updateOrganization({
        organizationId: wrapId(organizationId),
        name,
        description,
      }).response;
      return requireOrganization(response.organization);
    }, 'Failed to update organization.');
  }

  public delete(organizationId: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.deleteOrganization({ organizationId: wrapId(organizationId) }).response;
    }, 'Failed to delete organization.');
  }
}

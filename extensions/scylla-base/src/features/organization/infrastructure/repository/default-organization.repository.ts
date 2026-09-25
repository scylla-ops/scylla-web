import type { OrganizationRepository } from '@base/features/organization/domain/repository/organization.repository.ts';
import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { OrganizationRemoteDataSource } from '@base/features/organization/infrastructure/repository/data-sources/organization-remote.data-source.ts';
import { GrpcOrganizationMemberMapper } from '@base/features/organization/infrastructure/repository/mappers/grpc-organization-member.mapper.ts';
import { GrpcOrganizationMapper } from '@base/features/organization/infrastructure/repository/mappers/grpc-organization.mapper.ts';
import type { UserEntity } from '@base/features/user';
import type { OrganizationEntity } from '@base/features/organization/domain/entities/organization.entity.ts';

export default class DefaultOrganizationRepository implements OrganizationRepository {
  constructor(private readonly remoteDataSource: OrganizationRemoteDataSource) {}

  public async getAll(): Promise<ScyllaResult<OrganizationEntity[]>> {
    return (await this.remoteDataSource.getAll()).map(response =>
      response.organizations.map(GrpcOrganizationMapper.toDomain),
    );
  }

  public async getMine(): Promise<ScyllaResult<OrganizationEntity[]>> {
    return (await this.remoteDataSource.getMine()).map(response =>
      response.organizations.map(GrpcOrganizationMapper.toDomain),
    );
  }

  public async listMembers(organizationId: string): Promise<ScyllaResult<UserEntity[]>> {
    return (await this.remoteDataSource.listMembers(organizationId)).map(members =>
      members.map(GrpcOrganizationMemberMapper.toDomain),
    );
  }

  public async create(
    name: string,
    description?: string,
  ): Promise<ScyllaResult<OrganizationEntity>> {
    return (await this.remoteDataSource.create(name, description)).map(
      GrpcOrganizationMapper.toDomain,
    );
  }

  public async update(
    organizationId: string,
    name?: string,
    description?: string,
  ): Promise<ScyllaResult<OrganizationEntity>> {
    return (await this.remoteDataSource.update(organizationId, name, description)).map(
      GrpcOrganizationMapper.toDomain,
    );
  }

  public delete(organizationId: string): Promise<ScyllaResult<void>> {
    return this.remoteDataSource.delete(organizationId);
  }
}

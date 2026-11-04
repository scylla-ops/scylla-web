import type { OrganizationRepository } from '@base/features/organization/domain/repository/organization.repository.ts';
import type { OrganizationEntity } from '@base/features/organization/domain/entities/organization.entity.ts';
import type { IWorkspaceServiceClient } from '@base/generated/scylla/workspaces/v1/workspace_service.client.ts';
import type { IAccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import type { AccessEntry } from '@base/generated/scylla/access/v1/access_service.ts';
import type { Workspace } from '@base/generated/scylla/workspaces/v1/workspace.ts';
import type { UserSummary } from '@base/features/user';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcOrganization from './grpc-organization.mapper.ts';
import * as grpcOrganizationMember from './grpc-organization-member.mapper.ts';

const PAGE_SIZE = 100;

/** The server always fills it on success: an absent one is a protocol error. */
const requireWorkspace = (workspace?: Workspace): OrganizationEntity => {
  if (!workspace) throw new Error('Server returned no workspace.');
  return grpcOrganization.toDomain(workspace);
};

/** Reads each page of a list. */
const allPages = async <T>(
  read: (token: string) => Promise<{ items: T[]; next: string }>,
): Promise<T[]> => {
  const items: T[] = [];
  let token = '';
  do {
    const page = await read(token);
    items.push(...page.items);
    token = page.next;
  } while (token);
  return items;
};

export class DefaultOrganizationRepository implements OrganizationRepository {
  constructor(
    private readonly workspaces: IWorkspaceServiceClient,
    private readonly access: IAccessServiceClient,
  ) {}

  public async getMine(): Promise<OrganizationEntity[]> {
    const workspaces = await allPages(async token => {
      const response = await this.workspaces.listWorkspaces({ page: { size: PAGE_SIZE, token } })
        .response;
      return { items: response.workspaces, next: response.page?.nextToken ?? '' };
    });
    return workspaces.map(grpcOrganization.toDomain);
  }

  public async listMembers(organizationId: string): Promise<UserSummary[]> {
    const entries = await allPages<AccessEntry>(async token => {
      const response = await this.access.listAccess({
        object: { kind: 'workspace', id: wrapId(organizationId) },
        page: { size: PAGE_SIZE, token },
      }).response;
      return { items: response.entries, next: response.page?.nextToken ?? '' };
    });
    return grpcOrganizationMember.uniqueUsers(entries);
  }

  public async create(name: string, slug?: string): Promise<OrganizationEntity> {
    const response = await this.workspaces.createWorkspace({ name, ...(slug && { slug }) })
      .response;
    return requireWorkspace(response.workspace);
  }

  public async update(
    organizationId: string,
    name?: string,
    slug?: string,
  ): Promise<OrganizationEntity> {
    const response = await this.workspaces.updateWorkspace({
      workspaceId: wrapId(organizationId),
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
    }).response;
    return requireWorkspace(response.workspace);
  }

  public async delete(organizationId: string): Promise<void> {
    await this.workspaces.deleteWorkspace({ workspaceId: wrapId(organizationId) }).response;
  }
}

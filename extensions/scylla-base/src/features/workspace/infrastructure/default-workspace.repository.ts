import type { WorkspaceRepository } from '@base/features/workspace/domain/repository/workspace.repository.ts';
import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';
import type { IWorkspaceServiceClient } from '@base/generated/scylla/workspaces/v1/workspace_service.client.ts';
import type { IAccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import type { AccessEntry } from '@base/generated/scylla/access/v1/access_service.ts';
import type { Workspace } from '@base/generated/scylla/workspaces/v1/workspace.ts';
import type { UserSummary } from '@base/features/user';
import { required, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcWorkspace from './grpc-workspace.mapper.ts';
import * as grpcWorkspaceMember from './grpc-workspace-member.mapper.ts';

const PAGE_SIZE = 100;

const requireWorkspace = (workspace?: Workspace): WorkspaceEntity =>
  grpcWorkspace.toDomain(required(workspace, 'workspace'));

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

export class DefaultWorkspaceRepository implements WorkspaceRepository {
  constructor(
    private readonly workspaces: IWorkspaceServiceClient,
    private readonly access: IAccessServiceClient,
  ) {}

  public async getMine(): Promise<WorkspaceEntity[]> {
    const workspaces = await allPages(async token => {
      const response = await this.workspaces.listWorkspaces({ page: { size: PAGE_SIZE, token } })
        .response;
      return { items: response.workspaces, next: response.page?.nextToken ?? '' };
    });
    return workspaces.map(grpcWorkspace.toDomain);
  }

  public async listMembers(workspaceId: string): Promise<UserSummary[]> {
    const entries = await allPages<AccessEntry>(async token => {
      const response = await this.access.listAccess({
        object: { kind: 'workspace', id: wrapId(workspaceId) },
        page: { size: PAGE_SIZE, token },
      }).response;
      return { items: response.entries, next: response.page?.nextToken ?? '' };
    });
    return grpcWorkspaceMember.uniqueUsers(entries);
  }

  public async create(name: string, slug?: string): Promise<WorkspaceEntity> {
    const response = await this.workspaces.createWorkspace({ name, ...(slug && { slug }) })
      .response;
    return requireWorkspace(response.workspace);
  }

  public async update(workspaceId: string, name?: string, slug?: string): Promise<WorkspaceEntity> {
    const response = await this.workspaces.updateWorkspace({
      workspaceId: wrapId(workspaceId),
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
    }).response;
    return requireWorkspace(response.workspace);
  }

  public async setPersonalTokens(workspaceId: string, enabled: boolean): Promise<WorkspaceEntity> {
    const response = await this.workspaces.updateWorkspace({
      workspaceId: wrapId(workspaceId),
      personalTokensEnabled: enabled,
    }).response;
    return requireWorkspace(response.workspace);
  }

  public async delete(workspaceId: string): Promise<void> {
    await this.workspaces.deleteWorkspace({ workspaceId: wrapId(workspaceId) }).response;
  }
}

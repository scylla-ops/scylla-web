import { t } from '@lingui/core/macro';
import type { ProjectRepository } from '@base/features/project/domain/repository/project.repository.ts';
import type {
  ProjectEntity,
  ProjectList,
} from '@base/features/project/domain/entities/project.entity.ts';
import type { IProjectServiceClient } from '@base/generated/scylla/projects/v1/project_service.client.ts';
import type { IAccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import type { AccessEntry } from '@base/generated/scylla/access/v1/access_service.ts';
import type { Project } from '@base/generated/scylla/projects/v1/project.ts';
import type { UserSummary } from '@base/features/user';
import { DEFAULT_PAGE_SIZE, type PaginationParams } from '@scylla/ui/structs';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcProject from './grpc-project.mapper.ts';
import * as grpcProjectMember from './grpc-project-member.mapper.ts';

const PAGE_SIZE = 100;

/**
 * A cap on projects comes from an extension, with a server message in English: show our own
 * sentence instead, and keep the code.
 */
const toCreateProjectError = (thrown: unknown): unknown => {
  const error = ScyllaError.from(thrown);
  return error.code === 'RESOURCE_EXHAUSTED'
    ? new ScyllaError(t`This workspace has reached its project limit.`, {
        code: error.code,
        cause: error,
      })
    : thrown;
};

/** The wrapped entity is optional on the wire: fail here rather than pass `undefined` on. */
const requireProject = (project: Project | undefined): ProjectEntity => {
  if (!project) throw new Error('Server returned no project.');
  return grpcProject.toDomain(project);
};

export class DefaultProjectRepository implements ProjectRepository {
  constructor(
    private readonly client: IProjectServiceClient,
    private readonly access: IAccessServiceClient,
  ) {}

  public async getByWorkspaceId(
    workspaceId: string,
    pagination?: PaginationParams,
  ): Promise<ProjectList> {
    const projects: Project[] = [];
    let token = '';
    do {
      const response = await this.client.listProjects({
        workspaceId: wrapId(workspaceId),
        page: { size: PAGE_SIZE, token },
      }).response;
      projects.push(...response.projects);
      token = response.page?.nextToken ?? '';
    } while (token);
    return grpcProject.toDomainPage(
      projects,
      pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE },
    );
  }

  /** The roles on the project only: who reaches it through a workspace role is absent. */
  public async listMembers(projectId: string): Promise<UserSummary[]> {
    const entries: AccessEntry[] = [];
    let token = '';
    do {
      const response = await this.access.listAccess({
        object: { kind: 'project', id: wrapId(projectId) },
        page: { size: PAGE_SIZE, token },
      }).response;
      entries.push(...response.entries);
      token = response.page?.nextToken ?? '';
    } while (token);
    return grpcProjectMember.toDomainList(entries);
  }

  public async create(
    name: string,
    workspaceId: string,
    description?: string,
  ): Promise<ProjectEntity> {
    try {
      const response = await this.client.createProject({
        name,
        workspaceId: wrapId(workspaceId),
        description: description ?? '',
      }).response;
      return requireProject(response.project);
    } catch (error) {
      throw toCreateProjectError(error);
    }
  }

  public async update(
    projectId: string,
    name?: string,
    description?: string,
  ): Promise<ProjectEntity> {
    const response = await this.client.updateProject({
      projectId: wrapId(projectId),
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    }).response;
    return requireProject(response.project);
  }

  public async delete(projectId: string): Promise<void> {
    await this.client.deleteProject({ projectId: wrapId(projectId) }).response;
  }
}

import { t } from '@lingui/core/macro';
import type { ProjectRepository } from '@base/features/project/domain/repository/project.repository.ts';
import type {
  ProjectEntity,
  ProjectIconChange,
  ProjectList,
} from '@base/features/project/domain/entities/project.entity.ts';
import type {
  ProjectCounts,
  ProjectSearch,
  ProjectSearchResult,
} from '@base/features/project/domain/structs/project-search.struct.ts';
import type { IProjectServiceClient } from '@base/generated/scylla/projects/v1/project_service.client.ts';
import type { Project } from '@base/generated/scylla/projects/v1/project.ts';
import { ProjectHealth, ProjectOrder } from '@base/generated/scylla/projects/v1/project_service.ts';
import { DEFAULT_PAGE_SIZE, type PaginationParams } from '@scylla/ui/structs';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { required, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcProject from './grpc-project.mapper.ts';

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

/** The server answers an unknown id as a refusal, and a text that is not an id as an invalid argument. */
const isNoSuchProject = (thrown: unknown): boolean => {
  const { code } = ScyllaError.from(thrown);
  return code === 'PERMISSION_DENIED' || code === 'INVALID_ARGUMENT';
};

const requireProject = (project: Project | undefined): ProjectEntity =>
  grpcProject.toDomain(required(project, 'project'));

export class DefaultProjectRepository implements ProjectRepository {
  constructor(private readonly client: IProjectServiceClient) {}

  public async getById(projectId: string): Promise<ProjectEntity | null> {
    try {
      const response = await this.client.getProject({ projectId: wrapId(projectId) }).response;
      return requireProject(response.project);
    } catch (error) {
      if (isNoSuchProject(error)) return null;
      throw error;
    }
  }

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
        query: '',
        order: ProjectOrder.UNSPECIFIED,
        health: ProjectHealth.UNSPECIFIED,
        projectIds: [],
      }).response;
      projects.push(...response.projects);
      token = response.page?.nextToken ?? '';
    } while (token);
    return grpcProject.toDomainPage(
      projects,
      pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE },
    );
  }

  /** Reads pages of at most 100 projects until it has `limit` of them, or none is left. */
  public async search(search: ProjectSearch): Promise<ProjectSearchResult> {
    const projects: Project[] = [];
    let counts: ProjectCounts | undefined;
    let token = '';
    do {
      const response = await this.client.listProjects({
        workspaceId: wrapId(search.workspaceId),
        page: { size: Math.min(PAGE_SIZE, search.limit - projects.length), token },
        query: search.query,
        order: grpcProject.orderToProto(search.order),
        health: grpcProject.healthToProto(search.health),
        section: grpcProject.sectionToProto(search.section),
        projectIds: (search.projectIds ?? []).map(wrapId),
      }).response;
      projects.push(...response.projects);
      counts ??= grpcProject.countsToDomain(response.counts);
      token = response.page?.nextToken ?? '';
    } while (token && projects.length < search.limit);
    return {
      items: projects.map(grpcProject.toDomain),
      counts: counts ?? grpcProject.countsToDomain(undefined),
      hasMore: !!token,
    };
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
    icon?: ProjectIconChange,
  ): Promise<ProjectEntity> {
    const response = await this.client.updateProject({
      projectId: wrapId(projectId),
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(icon && { icon: grpcProject.fromIconChange(icon) }),
    }).response;
    return requireProject(response.project);
  }

  public async setIcon(projectId: string, icon: ProjectIconChange): Promise<ProjectEntity> {
    const response = await this.client.updateProject({
      projectId: wrapId(projectId),
      icon: grpcProject.fromIconChange(icon),
    }).response;
    return requireProject(response.project);
  }

  public async delete(projectId: string): Promise<void> {
    await this.client.deleteProject({ projectId: wrapId(projectId) }).response;
  }
}

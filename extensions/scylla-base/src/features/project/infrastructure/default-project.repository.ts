import { t } from '@lingui/core/macro';
import type { ProjectRepository } from '@base/features/project/domain/repository/project.repository.ts';
import type {
  ProjectEntity,
  ProjectList,
} from '@base/features/project/domain/entities/project.entity.ts';
import type { IProjectServiceClient } from '@base/generated/scylla/project/v1/project.client.ts';
import type { Project } from '@base/generated/scylla/project/v1/project.ts';
import type { UserSummary } from '@base/features/user';
import { DEFAULT_PAGE_SIZE, type PaginationParams } from '@scylla/ui/structs';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcProject from './grpc-project.mapper.ts';
import * as grpcProjectMember from './grpc-project-member.mapper.ts';

/**
 * A cap on projects comes from an extension, with a server message in English that names the
 * organization by id: show our own sentence instead, and keep the code.
 */
const toCreateProjectError = (thrown: unknown): unknown => {
  const error = ScyllaError.from(thrown);
  return error.code === 'RESOURCE_EXHAUSTED'
    ? new ScyllaError(t`This organization has reached its project limit.`, {
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
  constructor(private readonly client: IProjectServiceClient) {}

  public async getByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<ProjectList> {
    const response = await this.client.listOrganizationProjects({
      organizationId: wrapId(organizationId),
      pagination: pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE },
    }).response;
    return grpcProject.toDomainList(response);
  }

  /** Project-scoped grants only: someone reaching it through an organization role is absent. */
  public async listMembers(projectId: string): Promise<UserSummary[]> {
    const response = await this.client.listProjectMembers({ projectId: wrapId(projectId) })
      .response;
    return response.members.map(grpcProjectMember.toDomain);
  }

  public async create(
    name: string,
    organizationId: string,
    description?: string,
  ): Promise<ProjectEntity> {
    try {
      const response = await this.client.createProject({
        name,
        organizationId: wrapId(organizationId),
        description,
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
      name,
      description,
    }).response;
    return requireProject(response.project);
  }

  public async delete(projectId: string): Promise<void> {
    await this.client.deleteProject({ projectId: wrapId(projectId) }).response;
  }
}

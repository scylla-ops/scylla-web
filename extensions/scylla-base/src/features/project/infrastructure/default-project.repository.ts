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
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import { GrpcProjectMapper } from './grpc-project.mapper.ts';
import { GrpcProjectMemberMapper } from './grpc-project-member.mapper.ts';

/**
 * A cap on projects comes from an extension, with a server message in English that names the
 * organization by id: show our own sentence instead, and keep the code.
 */
export const toCreateProjectError = (error: ScyllaError): ScyllaError =>
  error.getCode() === 'RESOURCE_EXHAUSTED'
    ? new ScyllaError(t`This organization has reached its project limit.`, {
        cause: { code: 'RESOURCE_EXHAUSTED' },
      })
    : error;

/** The wrapped entity is optional on the wire: fail here rather than pass `undefined` on. */
const requireProject = (project: Project | undefined): ProjectEntity => {
  if (!project) throw new Error('Server returned no project.');
  return GrpcProjectMapper.toDomain(project);
};

export class DefaultProjectRepository implements ProjectRepository {
  constructor(private readonly client: IProjectServiceClient) {}

  public getByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<ProjectList>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listOrganizationProjects({
        organizationId: wrapId(organizationId),
        pagination: pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE },
      }).response;
      return GrpcProjectMapper.toDomainList(response);
    }, 'Failed to fetch projects.');
  }

  /** Project-scoped grants only: someone reaching it through an organization role is absent. */
  public listMembers(projectId: string): Promise<ScyllaResult<UserSummary[]>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.listProjectMembers({ projectId: wrapId(projectId) })
        .response;
      return response.members.map(GrpcProjectMemberMapper.toDomain);
    }, 'Failed to fetch project members.');
  }

  public async create(
    name: string,
    organizationId: string,
    description?: string,
  ): Promise<ScyllaResult<ProjectEntity>> {
    const result = await ScyllaResult.tryAsync(async () => {
      const response = await this.client.createProject({
        name,
        organizationId: wrapId(organizationId),
        description,
      }).response;
      return requireProject(response.project);
    }, 'Failed to create project.');
    return result.mapError(toCreateProjectError);
  }

  public update(
    projectId: string,
    name?: string,
    description?: string,
  ): Promise<ScyllaResult<ProjectEntity>> {
    return ScyllaResult.tryAsync(async () => {
      const response = await this.client.updateProject({
        projectId: wrapId(projectId),
        name,
        description,
      }).response;
      return requireProject(response.project);
    }, 'Failed to update project.');
  }

  public delete(projectId: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this.client.deleteProject({ projectId: wrapId(projectId) }).response;
    }, 'Failed to delete project.');
  }
}

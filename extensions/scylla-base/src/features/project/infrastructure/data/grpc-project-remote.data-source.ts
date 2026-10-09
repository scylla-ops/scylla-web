import { type ScyllaGrpcTransport } from '@platform/grpc';
import { ProjectServiceClient } from '@base/generated/scylla/project/v1/project.client.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import { t } from '@lingui/core/macro';
import type {
  ListOrganizationProjectsResponse,
  Project,
  ProjectMember,
} from '@base/generated/scylla/project/v1/project.ts';

import {
  DEFAULT_PAGE_SIZE,
  type PaginationParams,
} from '@scylla/ui/structs';
import type { ProjectRemoteDataSource } from '@base/features/project/infrastructure/repository/data-sources/project-remote.data-source.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';

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
function requireProject(project: Project | undefined): Project {
  if (!project) throw new Error('Server returned no project.');
  return project;
}

export class GrpcProjectRemoteDataSource implements ProjectRemoteDataSource {
  private readonly _projectClient: ProjectServiceClient;

  constructor(_transport: ScyllaGrpcTransport) {
    this._projectClient = new ProjectServiceClient(_transport.getTransport());
  }

  public getByOrganizationId(
    organizationId: string,
    pagination?: PaginationParams,
  ): Promise<ScyllaResult<ListOrganizationProjectsResponse>> {
    return ScyllaResult.tryAsync(async () => {
      const { response } = await this._projectClient.listOrganizationProjects({
        organizationId: wrapId(organizationId),
        pagination: pagination ?? { page: 1, pageSize: DEFAULT_PAGE_SIZE },
      });
      return response;
    }, 'Failed to fetch projects.');
  }

  /** Project-scoped grants only: someone reaching it through an organization role is absent. */
  public listMembers(projectId: string): Promise<ScyllaResult<ProjectMember[]>> {
    return ScyllaResult.tryAsync(async () => {
      const { response } = await this._projectClient.listProjectMembers({
        projectId: wrapId(projectId),
      });
      return response.members;
    }, 'Failed to fetch project members.');
  }

  public async create(
    name: string,
    organizationId: string,
    description?: string,
  ): Promise<ScyllaResult<Project>> {
    const result = await ScyllaResult.tryAsync(async () => {
      const { response } = await this._projectClient.createProject({
        name,
        organizationId: wrapId(organizationId),
        description,
      });
      return requireProject(response.project);
    }, 'Failed to create project.');
    return result.mapError(toCreateProjectError);
  }

  public update(
    projectId: string,
    name?: string,
    description?: string,
  ): Promise<ScyllaResult<Project>> {
    return ScyllaResult.tryAsync(async () => {
      const { response } = await this._projectClient.updateProject({
        projectId: wrapId(projectId),
        name,
        description,
      });
      return requireProject(response.project);
    }, 'Failed to update project.');
  }

  public delete(projectId: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync(async () => {
      await this._projectClient.deleteProject({ projectId: wrapId(projectId) });
    }, 'Failed to delete project.');
  }
}

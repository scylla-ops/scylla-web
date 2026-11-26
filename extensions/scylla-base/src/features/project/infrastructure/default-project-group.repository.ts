import type { ProjectGroupRepository } from '@base/features/project/domain/repository/project-group.repository.ts';
import type {
  MoveProjectInput,
  ProjectGroupEntity,
} from '@base/features/project/domain/entities/project-group.entity.ts';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type { IProjectGroupServiceClient } from '@base/generated/scylla/projects/v1/project_group_service.client.ts';
import type { ProjectGroup } from '@base/generated/scylla/projects/v1/project_group.ts';
import { required, wrapId, wrapIdOpt } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcProjectGroup from './grpc-project-group.mapper.ts';
import * as grpcProject from './grpc-project.mapper.ts';

const PAGE_SIZE = 100;

const requireGroup = (group: ProjectGroup | undefined): ProjectGroupEntity =>
  grpcProjectGroup.toDomain(required(group, 'group'));

export class DefaultProjectGroupRepository implements ProjectGroupRepository {
  constructor(private readonly client: IProjectGroupServiceClient) {}

  /** Reads each page: the page shows all the groups at once. */
  public async list(workspaceId: string): Promise<ProjectGroupEntity[]> {
    const groups: ProjectGroup[] = [];
    let token = '';
    do {
      const response = await this.client.listProjectGroups({
        workspaceId: wrapId(workspaceId),
        page: { size: PAGE_SIZE, token },
      }).response;
      groups.push(...response.groups);
      token = response.page?.nextToken ?? '';
    } while (token);
    return groups.map(grpcProjectGroup.toDomain);
  }

  public async create(workspaceId: string, name: string): Promise<ProjectGroupEntity> {
    const response = await this.client.createProjectGroup({
      workspaceId: wrapId(workspaceId),
      name,
    }).response;
    return requireGroup(response.group);
  }

  public async rename(groupId: string, name: string): Promise<ProjectGroupEntity> {
    const response = await this.client.updateProjectGroup({ groupId: wrapId(groupId), name })
      .response;
    return requireGroup(response.group);
  }

  public async reorder(groupId: string, position: number): Promise<ProjectGroupEntity> {
    const response = await this.client.updateProjectGroup({
      groupId: wrapId(groupId),
      position: Math.max(0, position),
    }).response;
    return requireGroup(response.group);
  }

  public async delete(groupId: string): Promise<void> {
    await this.client.deleteProjectGroup({ groupId: wrapId(groupId) }).response;
  }

  public async move({ id, groupId, beforeId }: MoveProjectInput): Promise<ProjectEntity> {
    const response = await this.client.moveProject({
      projectId: wrapId(id),
      groupId: wrapIdOpt(groupId),
      beforeProjectId: wrapIdOpt(beforeId),
    }).response;
    return grpcProject.toDomain(required(response.project, 'project'));
  }
}

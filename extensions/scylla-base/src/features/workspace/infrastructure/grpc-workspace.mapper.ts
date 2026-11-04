import type { Workspace } from '@base/generated/scylla/workspaces/v1/workspace.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';

export function toDomain(workspace: Workspace): WorkspaceEntity {
  return {
    id: idValue(workspace.id),
    name: workspace.name,
    slug: workspace.slug,
  };
}

import type { Workspace } from '@base/generated/scylla/workspaces/v1/workspace.ts';
import { iconToDomain } from '@shared/infrastructure/grpc/icon.mapper.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';

export function toDomain(workspace: Workspace): WorkspaceEntity {
  const icon = iconToDomain(workspace.icon);
  return {
    id: idValue(workspace.id),
    name: workspace.name,
    slug: workspace.slug,
    personalTokensEnabled: workspace.personalTokensEnabled,
    timeZone: workspace.timeZone,
    ...(icon && { icon }),
  };
}

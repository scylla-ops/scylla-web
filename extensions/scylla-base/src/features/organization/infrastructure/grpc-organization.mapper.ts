import type { Workspace } from '@base/generated/scylla/workspaces/v1/workspace.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import type { OrganizationEntity } from '@base/features/organization/domain/entities/organization.entity.ts';

export function toDomain(workspace: Workspace): OrganizationEntity {
  return {
    id: idValue(workspace.id),
    name: workspace.name,
    slug: workspace.slug,
  };
}

import type {
  ProjectEntity,
  ProjectIcon,
  ProjectIconChange,
  ProjectList,
} from '@base/features/project/domain/entities/project.entity.ts';
import type { Icon, IconChange } from '@base/generated/scylla/common/v1/icon.ts';
import type { Project } from '@base/generated/scylla/projects/v1/project.ts';
import type { PaginationParams } from '@scylla/ui/structs';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';

/** An icon with no kind (a newer server) shows as the default icon. */
export function toIcon(icon: Icon | undefined): ProjectIcon | undefined {
  switch (icon?.kind.oneofKind) {
    case 'glyph':
      return {
        kind: 'glyph',
        name: icon.kind.glyph.name,
        ...(icon.kind.glyph.color && { color: icon.kind.glyph.color }),
      };
    case 'imageId':
      return { kind: 'image', imageId: idValue(icon.kind.imageId) };
    default:
      return undefined;
  }
}

/** No kind: the project takes the default icon again. */
export function fromIconChange(change: ProjectIconChange): IconChange {
  switch (change.kind) {
    case 'glyph':
      return { kind: { oneofKind: 'glyph', glyph: { name: change.name, color: change.color } } };
    case 'image':
      return { kind: { oneofKind: 'image', image: change.data } };
    default:
      return { kind: { oneofKind: undefined } };
  }
}

export function toDomain(grpcProject: Project): ProjectEntity {
  const icon = toIcon(grpcProject.icon);
  return {
    id: idValue(grpcProject.id),
    workspaceId: idValue(grpcProject.workspaceId),
    name: grpcProject.name,
    description: grpcProject.description,
    ...(icon && { icon }),
  };
}

/**
 * One page of the whole list. The server pages with tokens and has no count: the list is read
 * whole, then cut here, so that the page numbers of the UI stay.
 */
export function toDomainPage(
  projects: Project[],
  { page, pageSize }: PaginationParams,
): ProjectList {
  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: projects.slice(start, start + pageSize).map(toDomain),
    pagination: {
      totalCount: projects.length,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

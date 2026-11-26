import type { Workspace } from '@base/generated/scylla/workspaces/v1/workspace.ts';
import {
  WorkspaceOrder as GrpcWorkspaceOrder,
  type WorkspaceDetails,
  type WorkspaceOwner,
} from '@base/generated/scylla/workspaces/v1/workspace_service.ts';
import { Timestamp } from '@base/generated/google/protobuf/timestamp.ts';
import { imageUrl } from '@platform/grpc';
import { iconToDomain } from '@shared/infrastructure/grpc/icon.mapper.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import type {
  WorkspaceEntity,
  WorkspaceOrder,
  WorkspaceOwnerEntity,
} from '@base/features/workspace/domain/entities/workspace.entity.ts';

export function ownerToDomain(owner: WorkspaceOwner): WorkspaceOwnerEntity {
  return {
    id: idValue(owner.userId),
    username: owner.handle,
    ...(owner.displayName && { displayName: owner.displayName }),
    ...(owner.email && { email: owner.email }),
    ...(owner.avatar?.imageId?.value && { avatarUrl: imageUrl(owner.avatar.imageId.value) }),
    ...(owner.avatar?.color && { avatarColor: owner.avatar.color }),
  };
}

const detailsToDomain = (details: WorkspaceDetails): Partial<WorkspaceEntity> => ({
  ...(details.owner && { owner: ownerToDomain(details.owner) }),
  memberCount: details.memberCount,
  projectCount: details.projectCount,
  ...(details.lastActivityAt && { lastActivityAt: Timestamp.toDate(details.lastActivityAt) }),
  role: details.role,
});

export function toDomain(workspace: Workspace, details?: WorkspaceDetails): WorkspaceEntity {
  const icon = iconToDomain(workspace.icon);
  return {
    id: idValue(workspace.id),
    name: workspace.name,
    slug: workspace.slug,
    personalTokensEnabled: workspace.personalTokensEnabled,
    timeZone: workspace.timeZone,
    ...(icon && { icon }),
    ...(workspace.createdAt && { createdAt: Timestamp.toDate(workspace.createdAt) }),
    ...(details && detailsToDomain(details)),
  };
}

/** Joins each workspace to its details: the answer gives them in a list beside the workspaces. */
export function withDetails(workspaces: Workspace[], details: WorkspaceDetails[]): WorkspaceEntity[] {
  const byId = new Map(details.map(item => [idValue(item.workspaceId), item]));
  return workspaces.map(workspace => toDomain(workspace, byId.get(idValue(workspace.id))));
}

const ORDERS: Record<WorkspaceOrder, GrpcWorkspaceOrder> = {
  name: GrpcWorkspaceOrder.NAME,
  newest: GrpcWorkspaceOrder.NEWEST,
  oldest: GrpcWorkspaceOrder.OLDEST,
  activity: GrpcWorkspaceOrder.LAST_ACTIVITY,
};

export const orderToGrpc = (order: WorkspaceOrder): GrpcWorkspaceOrder => ORDERS[order];

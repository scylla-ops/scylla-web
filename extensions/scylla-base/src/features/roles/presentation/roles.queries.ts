import { i18n } from '@lingui/core';
import { authorizationReady, can, Permission } from '@platform/authz';
import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { toast } from '@scylla/ui/utils';
import type { CreateRoleInput, UpdateRoleInput } from '../domain/entities/role.entity.ts';
import type { RolesModule } from '../roles.module.ts';
import { rolesMessages } from './messages/roles.messages.ts';

const repository = () => getModuleDomain<typeof RolesModule.domain>('roles').roleRepository;

const ROLES_ROOT = 'roles';

export const roleQueries = {
  catalog: () =>
    queryOptions({
      queryKey: [ROLES_ROOT, 'catalog'] as const,
      queryFn: () => repository().catalog(),
      staleTime: Infinity,
    }),

  /** Checks for itself: the users page also lists the roles. */
  list: (workspaceId?: string, options: { enabled?: boolean } = {}) =>
    queryOptions({
      queryKey: [ROLES_ROOT, 'list', workspaceId ?? 'instance'] as const,
      queryFn: () => repository().list(workspaceId),
      enabled:
        (options.enabled ?? true) &&
        authorizationReady() &&
        (workspaceId
          ? can(Permission.MANAGE_WORKSPACE_ROLES, { workspaceId })
          : can(Permission.LIST_ROLES)),
    }),

  byKey: (key: string, workspaceId?: string) =>
    queryOptions({
      queryKey: [ROLES_ROOT, 'one', key, workspaceId ?? 'instance'] as const,
      queryFn: () => repository().get(key, workspaceId),
    }),
};

const invalidateRoles = () => getQueryClient().invalidateQueries({ queryKey: [ROLES_ROOT] });

export const roleMutations = {
  create: () =>
    mutationOptions({
      mutationFn: (input: CreateRoleInput) => repository().create(input),
      onSuccess: () => {
        toast.success(i18n._(rolesMessages.created));
        return invalidateRoles();
      },
    }),

  update: () =>
    mutationOptions({
      mutationFn: (input: UpdateRoleInput) => repository().update(input),
      onSuccess: () => {
        toast.success(i18n._(rolesMessages.updated));
        return invalidateRoles();
      },
    }),

  remove: () =>
    mutationOptions({
      mutationFn: (id: string) => repository().remove(id),
      onSuccess: () => {
        toast.success(i18n._(rolesMessages.deleted));
        return invalidateRoles();
      },
    }),

  changeInstanceRoles: () =>
    mutationOptions({
      mutationFn: ({ userId, give, takeBack }: InstanceRolesChange) =>
        repository().changeInstanceRoles(userId, give, takeBack),
      onSuccess: () => {
        toast.success(i18n._(rolesMessages.rolesChanged));
        const client = getQueryClient();
        return Promise.all([
          client.invalidateQueries({ queryKey: ['users'] }),
          client.invalidateQueries({ queryKey: [ROLES_ROOT] }),
        ]);
      },
    }),
};

export interface InstanceRolesChange {
  userId: string;
  give: string[];
  takeBack: string[];
}

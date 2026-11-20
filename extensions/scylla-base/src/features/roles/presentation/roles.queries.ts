import { i18n } from '@lingui/core';
import { authorizationReady, can, Permission } from '@platform/authz';
import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { toast } from '@scylla/ui/utils';
import type { CreateRoleInput, UpdateRoleInput } from '../domain/entities/role.entity.ts';
import type { RolesModule } from '../roles.module.ts';
import { rolesMessages } from './messages/roles.messages.ts';

const repository = () => getModuleDomain<typeof RolesModule.domain>('roles').roleRepository;

const ROLES_ROOT = 'roles';

export const CREATE_ROLE_MUTATION_KEY = ['role', 'create'] as const;

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
          ? can(Permission.LIST_WORKSPACE_ROLES, { workspaceId })
          : can(Permission.LIST_ROLES)),
    }),

  /** The caller gives `enabled`: read `canSeeRoleHolders`. */
  holders: (key: string, workspaceId?: string, options: { enabled?: boolean } = {}) =>
    queryOptions({
      queryKey: [ROLES_ROOT, 'holders', key, workspaceId ?? 'instance'] as const,
      queryFn: () => repository().holders(key, workspaceId),
      enabled: options.enabled ?? true,
    }),

  byKey: (key: string, workspaceId?: string) =>
    queryOptions({
      queryKey: [ROLES_ROOT, 'one', key, workspaceId ?? 'instance'] as const,
      queryFn: () => repository().get(key, workspaceId),
    }),
};

/**
 * The holders of a role: a reader of the members of the workspace, or a manager of the instance
 * roles. On the instance, `list_role_holders` comes with `create_role` only: a giver of the roles
 * reads the roles, not their holders.
 */
export const canSeeRoleHolders = (workspaceId?: string): boolean =>
  workspaceId
    ? can(Permission.LIST_WORKSPACE_MEMBERS, { workspaceId })
    : can(Permission.MANAGE_ROLES);

/** The page of the people: the members of the workspace, or the users of the instance. */
export const canSeePeople = (workspaceId?: string): boolean =>
  workspaceId
    ? can(Permission.LIST_WORKSPACE_MEMBERS, { workspaceId })
    : can(Permission.LIST_USERS);

const invalidateRoles = () => getQueryClient().invalidateQueries({ queryKey: [ROLES_ROOT] });

export const roleMutations = {
  create: () =>
    mutationOptions({
      mutationKey: CREATE_ROLE_MUTATION_KEY,
      meta: { showsOwnError: true },
      mutationFn: (input: CreateRoleInput) => repository().create(input),
      onSuccess: () => {
        toast.success(i18n._(rolesMessages.created));
        return invalidateRoles();
      },
    }),

  update: () =>
    mutationOptions({
      meta: { showsOwnError: true },
      mutationFn: (input: UpdateRoleInput) => repository().update(input),
      onSuccess: () => {
        toast.success(i18n._(rolesMessages.updated));
        return invalidateRoles();
      },
    }),

  remove: () =>
    mutationOptions({
      mutationFn: ({ id, moveTo }: { id: string; moveTo?: string }) =>
        repository().remove(id, moveTo),
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

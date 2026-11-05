import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { permissionsStore, type EffectiveScope } from '@platform/authz';
import type { AccessModule } from '../access.module.ts';
import {
  platformRef,
  projectRef,
  workspaceRef,
  PLATFORM_ID,
  type ObjectRef,
} from '../domain/structs/object-ref.struct.ts';
import {
  EVERY_USER,
  SCOPE_OF,
  namesFor,
  permissionsFrom,
} from '../domain/structs/permission-map.struct.ts';

const repository = () => getModuleDomain<typeof AccessModule.domain>('access').accessRepository;

const ACCESS_QUERY_ROOT = 'access';
export const ACCESS_QUERY_KEY = (object: ObjectRef) =>
  [ACCESS_QUERY_ROOT, object.kind, object.id] as const;

const MEMBERS_QUERY_ROOT = 'members';

export const accessQueries = {
  /** Each member of a workspace or of a project. */
  members: (object: ObjectRef | null, options: { enabled?: boolean } = {}) =>
    queryOptions({
      queryKey: [MEMBERS_QUERY_ROOT, object?.kind ?? '', object?.id ?? ''] as const,
      queryFn: () => repository().listMembers(object!),
      enabled: (options.enabled ?? true) && !!object?.id,
    }),

  /** What one actor can do on a workspace or on a project. */
  memberAccess: (actorId: string, object: ObjectRef | null, options: { enabled?: boolean } = {}) =>
    queryOptions({
      queryKey: [
        MEMBERS_QUERY_ROOT,
        'access',
        actorId,
        object?.kind ?? '',
        object?.id ?? '',
      ] as const,
      queryFn: () => repository().memberAccess(actorId, object!),
      enabled: (options.enabled ?? true) && !!object?.id && actorId.length > 0,
    }),

  /** The permissions of the catalog that the caller holds on an object. */
  held: (object: ObjectRef | null, options: { enabled?: boolean } = {}) =>
    queryOptions({
      queryKey: [ACCESS_QUERY_ROOT, 'held', object?.kind ?? '', object?.id ?? ''] as const,
      queryFn: () => repository().heldPermissions(object!),
      enabled: (options.enabled ?? true) && !!object?.id,
    }),

  /** The roles on an object: its members. */
  list: (object: ObjectRef | null, options: { enabled?: boolean } = {}) =>
    queryOptions({
      queryKey: ACCESS_QUERY_KEY(object ?? { kind: 'workspace', id: '' }),
      queryFn: () => repository().listAccess(object!),
      enabled: (options.enabled ?? true) && !!object?.id,
    }),
};

/** The permissions of the caller on one object, as one scope of the store. */
const scopeOf = async (object: ObjectRef): Promise<EffectiveScope> => {
  const allowed = await repository().check(object, namesFor(object.kind));
  return {
    scope: SCOPE_OF[object.kind],
    scopeId: object.id === PLATFORM_ID ? '' : object.id,
    access: { kind: 'restricted', permissions: permissionsFrom(object.kind, allowed) },
  };
};

let current = { workspaceId: null as string | null, projectId: null as string | null };

/**
 * Every `can()` reads the store this writes: the permissions on the platform, on the active
 * workspace and on the active project, each one in one `CheckPermissions` call.
 */
export const refreshMyPermissions = async (): Promise<void> => {
  const setPermissions = permissionsStore.getState().setPermissions;
  if (!localStorage.getItem('userId')) {
    setPermissions({ scopes: [] });
    return;
  }

  const { workspaceId, projectId } = current;
  const objects = [
    platformRef,
    ...(workspaceId ? [workspaceRef(workspaceId)] : []),
    ...(projectId ? [projectRef(projectId)] : []),
  ];
  try {
    const scopes = await Promise.all(objects.map(scopeOf));
    const everyUser: EffectiveScope = {
      scope: SCOPE_OF.platform,
      scopeId: '',
      access: { kind: 'restricted', permissions: [...EVERY_USER] },
    };
    setPermissions({ scopes: [...scopes, everyUser] });
  } catch {
    // On failure: no permissions. The backend still enforces.
    setPermissions({ scopes: [] });
  }
};

/** Reloads only when user, workspace or project change. */
let lastSyncedKey: string | null = null;

export const syncMyPermissions = (workspaceId: string | null, projectId: string | null): void => {
  const userId = localStorage.getItem('userId') ?? '';
  const key = `${userId}/${workspaceId ?? ''}/${projectId ?? ''}`;
  if (lastSyncedKey === key) return;

  lastSyncedKey = key;
  current = { workspaceId, projectId };
  void refreshMyPermissions();
};

/** For tests and sign-out. */
export const resetPermissionSync = (): void => {
  lastSyncedKey = null;
};

/** A role change can change what the caller may do: its permissions reload too. */
const afterAccessChange = (object: ObjectRef) => {
  void getQueryClient().invalidateQueries({ queryKey: ACCESS_QUERY_KEY(object) });
  void getQueryClient().invalidateQueries({ queryKey: [MEMBERS_QUERY_ROOT] });
  void refreshMyPermissions();
};

export interface RoleChange {
  object: ObjectRef;
  role: string;
  actorId: string;
}

export const accessMutations = {
  grant: () =>
    mutationOptions({
      mutationFn: ({ object, role, actorId }: RoleChange) =>
        repository().grant(object, role, actorId),
      onSuccess: (_result, { object }) => afterAccessChange(object),
    }),

  revoke: () =>
    mutationOptions({
      mutationFn: ({ object, role, actorId }: RoleChange) =>
        repository().revoke(object, role, actorId),
      onSuccess: (_result, { object }) => afterAccessChange(object),
    }),
};

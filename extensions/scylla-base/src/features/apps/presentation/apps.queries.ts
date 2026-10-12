import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { Permission, can } from '@platform/authz';
import type { AppEntity, AppSecretEntity } from '../domain/entities/app.entity.ts';
import type {
  AppAccess,
  CreatedApp,
  CreatedAppSecret,
  ResetAppSecret,
} from '../domain/structs/app.struct.ts';
import { trimSecretLabel } from '../domain/structs/secret-label.struct.ts';
import type { AppsModule } from '../apps.module.ts';
import type { ScyllaResult } from '@shared/utils/scylla-result.ts';

// Resolved per call: tests swap the registry.
const domain = () => getModuleDomain<typeof AppsModule.domain>('apps');
const repository = () => domain().appsRepository;

export const APPS_QUERY_KEY = (organizationId: string) => ['apps', organizationId] as const;
export const APP_QUERY_KEY = (appId: string) => ['apps', 'detail', appId] as const;
export const APP_SECRETS_QUERY_KEY = (appId: string) => ['app-secrets', appId] as const;
export const APP_ACCESS_QUERY_KEY = (appId: string) => ['app-access', appId] as const;

export const appQueries = {
  byOrganization: (organizationId: string) =>
    queryOptions<AppEntity[]>({
      queryKey: APPS_QUERY_KEY(organizationId),
      enabled: !!organizationId,
      queryFn: async () => (await repository().listApps(organizationId)).unwrap(),
    }),

  byId: (appId: string) =>
    queryOptions<AppEntity>({
      queryKey: APP_QUERY_KEY(appId),
      enabled: !!appId,
      queryFn: async () => (await repository().getApp(appId)).unwrap(),
    }),

  /** Metadata only. `agents` reads it outside this module's pages: checked here. */
  secretsOf: (appId: string) =>
    queryOptions<AppSecretEntity[]>({
      queryKey: APP_SECRETS_QUERY_KEY(appId),
      enabled: !!appId && can(Permission.READ_APP),
      queryFn: async () => (await repository().listAppSecrets(appId)).unwrap(),
    }),

  /** Every grant of the app, with names. Checked here, like `secretsOf`. */
  accessOf: (appId: string) =>
    queryOptions<AppAccess[]>({
      queryKey: APP_ACCESS_QUERY_KEY(appId),
      enabled: !!appId && can(Permission.READ_APP),
      staleTime: 30_000,
      queryFn: async () => (await repository().listAppAccess(appId)).unwrap(),
    }),
};

const invalidateList = (organizationId: string) =>
  getQueryClient().invalidateQueries({ queryKey: APPS_QUERY_KEY(organizationId) });

const invalidateSecrets = (appId: string) =>
  getQueryClient().invalidateQueries({ queryKey: APP_SECRETS_QUERY_KEY(appId) });

/** Before the refetch of the list: until it comes back, the cached list holds the app. */
const forgetApp = async (organizationId: string, appId: string) => {
  const client = getQueryClient();
  const list = APPS_QUERY_KEY(organizationId);
  const entries = [APP_QUERY_KEY(appId), APP_SECRETS_QUERY_KEY(appId), APP_ACCESS_QUERY_KEY(appId)];
  await Promise.all(
    [list, ...entries].map(queryKey => client.cancelQueries({ queryKey, exact: true })),
  );
  client.setQueryData<AppEntity[]>(list, apps => apps?.filter(app => app.id !== appId));
  for (const queryKey of entries) client.removeQueries({ queryKey, exact: true });
};

/**
 * `null` when another secret of the app has the label (`ALREADY_EXISTS`): the dialog shows it
 * under the field, not in the global toast. Any other error throws.
 */
const unlessLabelTaken = <T>(result: ScyllaResult<T>): T | null =>
  result.fold<T | null>({
    onSuccess: value => value,
    onError: error => {
      if (error.isAlreadyExists()) return null;
      throw error;
    },
  });

export const appMutations = {
  /** The value passes through once and is never stored. */
  create: (organizationId: string) =>
    mutationOptions({
      mutationFn: async ({ name }: { name: string }): Promise<CreatedApp> =>
        (await repository().createApp(organizationId, name)).unwrap(),
      onSuccess: () => void invalidateList(organizationId),
    }),

  remove: (organizationId: string) =>
    mutationOptions({
      mutationFn: async (appId: string) => (await repository().deleteApp(appId)).unwrap(),
      onSuccess: async (_data, appId) => {
        await forgetApp(organizationId, appId);
        void invalidateList(organizationId);
      },
    }),

  /** Reversible, unlike deleting. */
  setActive: (organizationId: string) =>
    mutationOptions({
      mutationFn: async ({ appId, active }: { appId: string; active: boolean }) =>
        (await repository().setAppActive(appId, active)).unwrap(),
      onSuccess: (_data, { appId }) => {
        // The list and the detail both show the flag.
        void invalidateList(organizationId);
        void getQueryClient().invalidateQueries({ queryKey: APP_QUERY_KEY(appId) });
      },
    }),

  createSecret: (appId: string) =>
    mutationOptions({
      mutationFn: async (label: string): Promise<CreatedAppSecret> =>
        (await repository().createAppSecret(appId, label)).unwrap(),
      onSuccess: () => void invalidateSecrets(appId),
    }),

  /**
   * Through `ResetAppSecretUseCase`: a new secret, then the others revoked when asked. The
   * result holds the plaintext: `gcTime: 0` drops it from the cache once the caller resets.
   * `null`: the label is taken, nothing changed.
   */
  resetSecret: (appId: string) =>
    mutationOptions({
      gcTime: 0,
      mutationFn: async ({
        label,
        revokeOthers,
      }: {
        label: string;
        revokeOthers: boolean;
      }): Promise<ResetAppSecret | null> =>
        unlessLabelTaken(await domain().resetAppSecret.execute({ appId, label, revokeOthers })),
      onSuccess: () => void invalidateSecrets(appId),
    }),

  /** Irreversible, and cuts any session using the secret. Confirm first. */
  revokeSecret: (appId: string) =>
    mutationOptions({
      mutationFn: async (secretId: string) =>
        (await repository().revokeAppSecret(secretId)).unwrap(),
      onSuccess: () => void invalidateSecrets(appId),
    }),

  setSecretEnabled: (appId: string) =>
    mutationOptions({
      mutationFn: async ({ secretId, enabled }: { secretId: string; enabled: boolean }) =>
        (await repository().setAppSecretEnabled(secretId, enabled)).unwrap(),
      onSuccess: () => void invalidateSecrets(appId),
    }),

  /** `null`: the label is taken. The secrets refresh in both cases, to show the taken label. */
  setSecretLabel: (appId: string) =>
    mutationOptions({
      mutationFn: async ({
        secretId,
        label,
      }: {
        secretId: string;
        label: string;
      }): Promise<AppSecretEntity | null> =>
        unlessLabelTaken(await repository().setAppSecretLabel(secretId, trimSecretLabel(label))),
      onSuccess: () => void invalidateSecrets(appId),
    }),
};

// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/query-core';
import { setDependencyRegistry, setQueryClient } from '@scylla/core-sdk';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { runMutationFn, runOnSuccess, runQueryFn } from '@test/queries.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { AppsRepository } from '@base/features/apps/domain/repository/apps.repository.ts';
import type { ResetAppSecretUseCase } from '@base/features/apps/domain/use-cases/reset-app-secret.use-case.ts';
import {
  APPS_QUERY_KEY,
  APP_ACCESS_QUERY_KEY,
  APP_QUERY_KEY,
  APP_SECRETS_QUERY_KEY,
  appMutations,
  appQueries,
} from '../apps.queries.ts';

const app = {
  id: 'app-1',
  organizationId: 'org-1',
  name: 'ci-runner',
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

const grant = (permissions: Permission[] | 'all') =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access:
            permissions === 'all' ? { kind: 'fullControl' } : { kind: 'restricted', permissions },
        },
      ],
    },
  });

let repository: AppsRepository;
let resetAppSecret: { execute: ReturnType<typeof vi.fn> };
let queryClient: QueryClient;
let invalidate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  repository = {
    listApps: vi.fn().mockResolvedValue([app]),
    getApp: vi.fn().mockResolvedValue(app),
    createApp: vi.fn().mockResolvedValue({ app, secret: 'sk-once' }),
    deleteApp: vi.fn().mockResolvedValue(undefined),
    setAppActive: vi.fn().mockResolvedValue(app),
    listAppSecrets: vi.fn().mockResolvedValue([]),
    createAppSecret: vi.fn().mockResolvedValue({ credential: {}, secret: 's' }),
    revokeAppSecret: vi.fn().mockResolvedValue(undefined),
    setAppSecretEnabled: vi.fn().mockResolvedValue({}),
    setAppSecretLabel: vi.fn().mockResolvedValue({ label: 'runner.local' }),
    listAppAccess: vi.fn().mockResolvedValue([]),
  };
  resetAppSecret = { execute: vi.fn() };

  setDependencyRegistry({
    apps: {
      appsRepository: repository,
      resetAppSecret: resetAppSecret as unknown as ResetAppSecretUseCase,
    },
  });
  grant('all');

  queryClient = new QueryClient();
  invalidate = vi.fn();
  queryClient.invalidateQueries = invalidate as unknown as QueryClient['invalidateQueries'];
  setQueryClient(queryClient);
});

afterEach(() => {
  setDependencyRegistry(null);
  setQueryClient(null);
  permissionsStore.setState({ permissions: null });
});

describe('appQueries', () => {
  it('lists the apps of one organization', async () => {
    const options = appQueries.byOrganization('org-1');

    expect(options.queryKey).toEqual(APPS_QUERY_KEY('org-1'));
    await expect(runQueryFn(options)).resolves.toEqual([app]);
    expect(repository.listApps).toHaveBeenCalledWith('org-1');
  });

  it('stays disabled without an organization, rather than fetching for an empty id', () => {
    expect(appQueries.byOrganization('').enabled).toBe(false);
    expect(appQueries.byId('').enabled).toBe(false);
    expect(appQueries.secretsOf('').enabled).toBe(false);
  });

  it('asks for the secrets and the grants only with READ_APP: agents reads them outside this module', () => {
    expect(appQueries.secretsOf('app-1').enabled).toBe(true);
    expect(appQueries.accessOf('app-1').enabled).toBe(true);

    grant([Permission.LIST_AGENTS]);

    expect(appQueries.secretsOf('app-1').enabled).toBe(false);
    expect(appQueries.accessOf('app-1').enabled).toBe(false);
  });

  it('lists the grants of an app in their own cache entry', async () => {
    const options = appQueries.accessOf('app-1');

    expect(options.queryKey).toEqual(APP_ACCESS_QUERY_KEY('app-1'));
    await runQueryFn(options);
    expect(repository.listAppAccess).toHaveBeenCalledWith('app-1');
  });

  it('keeps an app and its secrets in separate cache entries', () => {
    // Different keys: a secret mutation invalidates the secrets, not the detail.
    expect(APP_QUERY_KEY('app-1')).not.toEqual(APP_SECRETS_QUERY_KEY('app-1'));
  });

  it('surfaces a repository failure so TanStack Query owns the error', async () => {
    vi.mocked(repository.getApp).mockRejectedValue(new ScyllaError('gone'));

    await expect(runQueryFn(appQueries.byId('app-1'))).rejects.toThrow('gone');
  });
});

describe('appMutations', () => {
  it('creates an app and invalidates the list it now belongs to', async () => {
    const options = appMutations.create('org-1');
    const variables = { name: 'ci-runner' };

    const created = await runMutationFn(options, variables);
    expect(repository.createApp).toHaveBeenCalledWith('org-1', 'ci-runner');
    expect(created.secret).toBe('sk-once');

    runOnSuccess(options, created, variables);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: APPS_QUERY_KEY('org-1') });
  });

  it('takes a deleted app out of the cached list and drops its own entries before the refetch', async () => {
    const other = { ...app, id: 'app-2', name: 'deployer' };
    const own = [
      APP_QUERY_KEY('app-1'),
      APP_SECRETS_QUERY_KEY('app-1'),
      APP_ACCESS_QUERY_KEY('app-1'),
    ];
    queryClient.setQueryData(APPS_QUERY_KEY('org-1'), [app, other]);
    for (const queryKey of own) queryClient.setQueryData(queryKey, {});
    queryClient.setQueryData(APP_QUERY_KEY('app-2'), other);
    const cancel = vi.spyOn(queryClient, 'cancelQueries');
    let listAtRefetch: unknown;
    invalidate.mockImplementation(() => {
      listAtRefetch = queryClient.getQueryData(APPS_QUERY_KEY('org-1'));
    });
    const options = appMutations.remove('org-1');

    await runMutationFn(options, 'app-1');
    expect(repository.deleteApp).toHaveBeenCalledWith('app-1');

    runOnSuccess(options, undefined, 'app-1');
    await vi.waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: APPS_QUERY_KEY('org-1') }),
    );
    expect(listAtRefetch).toEqual([other]);
    expect(cancel).toHaveBeenCalledWith({ queryKey: APPS_QUERY_KEY('org-1'), exact: true });
    for (const queryKey of own) {
      expect(cancel).toHaveBeenCalledWith({ queryKey, exact: true });
      expect(queryClient.getQueryState(queryKey)).toBeUndefined();
    }
    expect(queryClient.getQueryData(APP_QUERY_KEY('app-2'))).toEqual(other);
  });

  it('invalidates both the list and the detail after a toggle, since both show the flag', async () => {
    const options = appMutations.setActive('org-1');
    const variables = { appId: 'app-1', active: false };

    await runMutationFn(options, variables);
    expect(repository.setAppActive).toHaveBeenCalledWith('app-1', false);

    runOnSuccess(options, app, variables);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: APPS_QUERY_KEY('org-1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: APP_QUERY_KEY('app-1') });
  });

  it('revoking a secret refreshes that app secrets list and nothing else', async () => {
    const options = appMutations.revokeSecret('app-1');

    await runMutationFn(options, 'secret-9');
    expect(repository.revokeAppSecret).toHaveBeenCalledWith('secret-9');

    runOnSuccess(options, undefined, 'secret-9');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: APP_SECRETS_QUERY_KEY('app-1') });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: APPS_QUERY_KEY('org-1') });
  });

  it('resets through the use case, refreshes the secrets, and keeps no copy of the plaintext', async () => {
    const result = {
      created: { credential: {}, secret: 'new-plaintext' },
      revoked: [],
      kept: [],
      failed: [],
    };
    resetAppSecret.execute.mockResolvedValue(result);
    const options = appMutations.resetSecret('app-1');
    const variables = { label: 'runner.local', revokeOthers: true };

    await expect(runMutationFn(options, variables)).resolves.toBe(result);
    expect(resetAppSecret.execute).toHaveBeenCalledWith({
      appId: 'app-1',
      label: 'runner.local',
      revokeOthers: true,
    });
    expect(options.gcTime).toBe(0);

    runOnSuccess(options, result as never, variables);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: APP_SECRETS_QUERY_KEY('app-1') });
  });

  it('gives null for a reset whose label is taken, so the dialog shows it under the field', async () => {
    resetAppSecret.execute.mockRejectedValue(new ScyllaError('taken', { code: 'ALREADY_EXISTS' }));

    await expect(
      runMutationFn(appMutations.resetSecret('app-1'), { label: 'ci', revokeOthers: true }),
    ).resolves.toBeNull();
  });

  it('renames a secret with the trimmed label and refreshes the secrets of the app', async () => {
    const options = appMutations.setSecretLabel('app-1');
    const variables = { secretId: 'secret-9', label: ' runner.local ' };

    await expect(runMutationFn(options, variables)).resolves.toEqual({ label: 'runner.local' });
    expect(repository.setAppSecretLabel).toHaveBeenCalledWith('secret-9', 'runner.local');

    runOnSuccess(options, null, variables);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: APP_SECRETS_QUERY_KEY('app-1') });
  });

  it('trims a new label as CE does: a leading U+0085 goes, which JS trim keeps', async () => {
    await runMutationFn(appMutations.setSecretLabel('app-1'), {
      secretId: 'secret-9',
      label: '\u0085abc',
    });

    expect(repository.setAppSecretLabel).toHaveBeenCalledWith('secret-9', 'abc');
  });

  it('gives null for a taken label and throws any other error to the global handler', async () => {
    const options = appMutations.setSecretLabel('app-1');
    const variables = { secretId: 'secret-9', label: 'ci' };
    vi.mocked(repository.setAppSecretLabel).mockRejectedValueOnce(
      new ScyllaError('taken', { code: 'ALREADY_EXISTS' }),
    );
    await expect(runMutationFn(options, variables)).resolves.toBeNull();

    vi.mocked(repository.setAppSecretLabel).mockRejectedValueOnce(
      new ScyllaError('denied', { code: 'PERMISSION_DENIED' }),
    );
    await expect(runMutationFn(options, variables)).rejects.toThrow('denied');
  });

  it('keeps disabling a secret distinct from revoking it', async () => {
    await runMutationFn(appMutations.setSecretEnabled('app-1'), {
      secretId: 'secret-9',
      enabled: false,
    });

    // Disabling is reversible, revoking is not: two distinct calls.
    expect(repository.setAppSecretEnabled).toHaveBeenCalledWith('secret-9', false);
    expect(repository.revokeAppSecret).not.toHaveBeenCalled();
  });
});

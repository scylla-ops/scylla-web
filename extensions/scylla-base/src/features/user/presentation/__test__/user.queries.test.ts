import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { runMutationFn, runOnSuccess, runQueryFn } from '@test/queries.ts';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type * as Login from '@base/features/login';
import {
  ME_QUERY_KEY,
  USERS_QUERY_KEY,
  USER_ACCESS_QUERY_KEY,
  USER_QUERY_KEY,
  userMutations,
  userQueries,
} from '../user.queries.ts';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const signOut = vi.fn();
vi.mock('@base/features/login', async importOriginal => ({
  ...(await importOriginal<typeof Login>()),
  signOut: () => signOut(),
}));

const failure = (code: string, message: string) =>
  ScyllaResult.error<void>(
    new ScyllaError('Failed.', { cause: Object.assign(new Error(message), { code }) }),
  );

const me = { userId: 'user-1', username: 'ada', isActive: true, updatedAt: '' };

let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let repository: Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  repository = {
    getMe: vi.fn().mockResolvedValue(ScyllaResult.success(me)),
    listAccess: vi.fn().mockResolvedValue(ScyllaResult.success([])),
    update: vi.fn().mockResolvedValue(ScyllaResult.success(me)),
    changePassword: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
    deleteAccount: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
  };
  cache = withQueryClient();
  restoreRegistry = withRegistry({ user: { userRepository: repository } });
});

afterEach(() => {
  restoreRegistry();
  cache.restore();
  localStorage.clear();
  permissionsStore.setState({ permissions: null });
});

const holding = (permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        { scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'restricted', permissions } },
      ],
    },
  });

describe('userQueries.me', () => {
  it('reads the account of the session, with no id', async () => {
    await expect(runQueryFn(userQueries.me())).resolves.toEqual(me);
    expect(repository.getMe).toHaveBeenCalledWith();
  });
});

describe.each([
  ['access', userQueries.access],
  ['byId', userQueries.byId],
] as const)('userQueries.%s checks for itself', (_name, factory) => {
  it('waits for an id and for the gate of the caller', () => {
    holding([Permission.READ_USER]);

    expect(factory(undefined).enabled).toBe(false);
    expect(factory('user-2', { enabled: false }).enabled).toBe(false);
    expect(factory('user-2').enabled).toBe(true);
  });

  it('refuses another id without READ_USER', () => {
    holding([]);

    expect(factory('user-2').enabled).toBe(false);
  });

  it('reads the own id with no grant', () => {
    holding([]);
    localStorage.setItem('userId', 'user-1');

    expect(factory('user-1').enabled).toBe(true);
  });

  it('refuses another id while the permissions are unknown', () => {
    expect(factory('user-2').enabled).toBe(false);
  });
});

describe('userQueries.access', () => {
  it('lists the grants of the user', async () => {
    await runQueryFn(userQueries.access('user-2'));

    expect(repository.listAccess).toHaveBeenCalledWith('user-2');
  });
});

describe('userMutations.update', () => {
  it('refreshes the page of the user, the directory and the own account', async () => {
    const invalidate = vi.spyOn(cache.queryClient, 'invalidateQueries');
    const options = userMutations.update();

    runOnSuccess(options, me, { userId: 'user-1', displayName: 'Ada' });

    await vi.waitFor(() => expect(invalidate).toHaveBeenCalledTimes(3));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: USER_QUERY_KEY('user-1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: USERS_QUERY_KEY() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ME_QUERY_KEY() });
  });
});

describe('userMutations.changePassword', () => {
  it('is null once the password is changed', async () => {
    await expect(
      runMutationFn(userMutations.changePassword(), {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    ).resolves.toBeNull();
  });

  it('gives a wrong current password as data, not as an error to toast', async () => {
    repository.changePassword.mockResolvedValue(
      failure('FAILED_PRECONDITION', 'Current password is incorrect'),
    );

    await expect(
      runMutationFn(userMutations.changePassword(), {
        currentPassword: 'wrong',
        newPassword: 'new-password',
      }),
    ).resolves.toBe('Current password is incorrect');
  });

  it('throws any other error, for the global handler', async () => {
    repository.changePassword.mockResolvedValue(failure('UNAVAILABLE', 'down'));

    await expect(
      runMutationFn(userMutations.changePassword(), {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    ).rejects.toBeInstanceOf(ScyllaError);
  });
});

describe('userMutations.deleteAccount', () => {
  it('gives the organizations to hand over as data', async () => {
    repository.deleteAccount.mockResolvedValue(
      failure('FAILED_PRECONDITION', 'Appoint another admin of Acme first'),
    );

    await expect(runMutationFn(userMutations.deleteAccount(), 'a-password')).resolves.toBe(
      'Appoint another admin of Acme first',
    );
  });
});

describe('userMutations.remove', () => {
  it('drops the page and the grants of the deleted user, and refreshes the directory', async () => {
    cache.queryClient.setQueryData(USER_QUERY_KEY('user-2'), { userId: 'user-2' });
    cache.queryClient.setQueryData(USER_ACCESS_QUERY_KEY('user-2'), []);
    cache.queryClient.setQueryData(USER_QUERY_KEY('user-3'), { userId: 'user-3' });
    const invalidate = vi.spyOn(cache.queryClient, 'invalidateQueries');

    runOnSuccess(userMutations.remove(), undefined, 'user-2');

    expect(cache.queryClient.getQueryData(USER_QUERY_KEY('user-2'))).toBeUndefined();
    expect(cache.queryClient.getQueryData(USER_ACCESS_QUERY_KEY('user-2'))).toBeUndefined();
    expect(cache.queryClient.getQueryData(USER_QUERY_KEY('user-3'))).toEqual({ userId: 'user-3' });
    await vi.waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: USERS_QUERY_KEY() }),
    );
  });
});

describe('userMutations.deleteAccount, after the call', () => {
  it('signs out once the account is deleted, also with no page left to do it', () => {
    runOnSuccess(userMutations.deleteAccount(), null, 'a-password');

    expect(signOut).toHaveBeenCalledOnce();
  });

  it('stays signed in when the server refuses', () => {
    runOnSuccess(userMutations.deleteAccount(), 'Appoint another admin first', 'a-password');

    expect(signOut).not.toHaveBeenCalled();
  });
});

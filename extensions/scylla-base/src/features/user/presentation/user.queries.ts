import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { Permission, authorizationReady, can } from '@platform/authz';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { signOut } from '@base/features/login';
import { refusalOf } from '@shared/utils/scylla-result.ts';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import type { CreateUserInput, UpdateUserInput } from '../domain/entities/user.entity.ts';
import type { UserModule } from '../user.module.ts';

const repository = () => getModuleDomain<typeof UserModule.domain>('user').userRepository;

export const USERS_QUERY_KEY = () => ['users'] as const;
export const USER_QUERY_KEY = (userId?: string) => ['user', userId] as const;
export const ME_QUERY_KEY = () => ['me'] as const;
export const USER_ACCESS_QUERY_KEY = (userId?: string) => ['user-access', userId] as const;

export const userQueries = {
  /** Checks `LIST_USERS` itself (used outside this module's route guard). An empty list can mean "not allowed": see `canListUsers`. */
  list: (options: { enabled?: boolean } = {}) =>
    queryOptions({
      queryKey: USERS_QUERY_KEY(),
      queryFn: async () => (await repository().getAll()).unwrap(),
      enabled: (options.enabled ?? true) && canListUsers(),
    }),

  /** Checks for itself, as `access` does: the own id, or `READ_USER`. */
  byId: (userId?: string, options: { enabled?: boolean } = {}) =>
    queryOptions({
      queryKey: USER_QUERY_KEY(userId),
      queryFn: async () => {
        if (!userId) throw new Error('User ID is required');
        return (await repository().getById(userId)).unwrap();
      },
      enabled: !!userId && (options.enabled ?? true) && canReadUser(userId),
    }),

  /** The account of the session. Needs no permission. */
  me: () =>
    queryOptions({
      queryKey: ME_QUERY_KEY(),
      queryFn: async () => (await repository().getMe()).unwrap(),
    }),

  /**
   * The grants of a user. Checks for itself (other extensions run it through the SDK): the own
   * id needs no grant, any other id needs `READ_USER`.
   */
  access: (userId?: string, options: { enabled?: boolean } = {}) =>
    queryOptions({
      queryKey: USER_ACCESS_QUERY_KEY(userId),
      queryFn: async () => {
        if (!userId) throw new Error('User ID is required');
        return (await repository().listAccess(userId)).unwrap();
      },
      enabled: !!userId && (options.enabled ?? true) && canReadUser(userId),
    }),
};

export const canListUsers = (): boolean => authorizationReady() && can(Permission.LIST_USERS);

/**
 * The backend lets a user read the own account with no grant. The own id is the one of the
 * session (`openSession` writes it); the account page reads the same id through `me`.
 */
const canReadUser = (userId: string): boolean =>
  userId === localStorage.getItem('userId') || can(Permission.READ_USER);

/** Every read that shows this user: its page, the directory and the account of the session. */
const invalidateUser = (userId: string) => {
  const client = getQueryClient();
  return Promise.all(
    [USER_QUERY_KEY(userId), USERS_QUERY_KEY(), ME_QUERY_KEY()].map(queryKey =>
      client.invalidateQueries({ queryKey }),
    ),
  );
};

export const userMutations = {
  create: () =>
    mutationOptions({
      mutationFn: async (input: CreateUserInput) => (await repository().create(input)).unwrap(),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.USER_CREATE));
        return getQueryClient().invalidateQueries({ queryKey: USERS_QUERY_KEY() });
      },
    }),

  /** Send the changed fields only. */
  update: () =>
    mutationOptions({
      mutationFn: async (input: UpdateUserInput) => (await repository().update(input)).unwrap(),
      onSuccess: (_result, input) => {
        toast.success(i18n._(ToastMessages.USER_UPDATE));
        return invalidateUser(input.userId);
      },
    }),

  remove: () =>
    mutationOptions({
      mutationFn: async (userId: string) => (await repository().delete(userId)).unwrap(),
      onSuccess: (_result, userId) => {
        toast.success(i18n._(ToastMessages.USER_DELETE));
        const client = getQueryClient();
        // Gone, not stale: a refetch would only answer NOT_FOUND.
        client.removeQueries({ queryKey: USER_QUERY_KEY(userId), exact: true });
        client.removeQueries({ queryKey: USER_ACCESS_QUERY_KEY(userId), exact: true });
        return client.invalidateQueries({ queryKey: USERS_QUERY_KEY() });
      },
    }),

  setActive: () =>
    mutationOptions({
      mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) =>
        (await repository().setActive(userId, isActive)).unwrap(),
      onSuccess: user => invalidateUser(user.userId),
    }),

  /** The refusal of a wrong current password: the page shows it under the field, as data. */
  changePassword: () =>
    mutationOptions({
      mutationFn: async ({
        currentPassword,
        newPassword,
      }: {
        currentPassword: string;
        newPassword: string;
      }) => refusalOf(await repository().changePassword(currentPassword, newPassword)),
    }),

  sendPasswordReset: () =>
    mutationOptions({
      mutationFn: async (userId: string) => (await repository().sendPasswordReset(userId)).unwrap(),
    }),

  revokeSessions: () =>
    mutationOptions({
      mutationFn: async (userId: string) => (await repository().revokeSessions(userId)).unwrap(),
    }),

  /**
   * The refusal (wrong password, organizations to hand over) is data: the dialog shows it. The
   * sign-out is here, not in the caller: it must run also when the page is already gone.
   */
  deleteAccount: () =>
    mutationOptions({
      mutationFn: async (password: string) => refusalOf(await repository().deleteAccount(password)),
      onSuccess: (refusal: string | null) => {
        if (refusal === null) signOut();
      },
    }),
};

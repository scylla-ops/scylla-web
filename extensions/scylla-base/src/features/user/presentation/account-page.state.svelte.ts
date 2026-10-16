import { i18n } from '@lingui/core';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { toast } from '@scylla/ui/utils';
import { profileChanges, type ProfileValues } from '../domain/entities/user.entity.ts';
import { groupUserAccess } from '../domain/structs/user-access.struct.ts';
import { userMessages } from './ui/user.messages.ts';
import { userMutations, userQueries } from './user.queries.ts';

/**
 * The account of the session: its own profile, password, sessions, grants and deletion. Every
 * call is on the own id, which needs no grant.
 */
export const createAccountPage = () => {
  const meQuery = createQuery(() => userQueries.me());
  const me = $derived(meQuery.data);
  const accessQuery = createQuery(() => userQueries.access(me?.userId));
  const sessionsQuery = createQuery(() => userQueries.sessions(me?.userId));
  const systemRole = $derived(groupUserAccess(accessQuery.data ?? []).system[0]?.roleName);

  const profileUpdate = createMutation(() => userMutations.update());
  const passwordChange = createMutation(() => userMutations.changePassword());
  const sessionRevocation = createMutation(() => userMutations.revokeSessions());
  const oneSessionRevocation = createMutation(() => userMutations.revokeSession());
  const accountDeletion = createMutation(() => userMutations.deleteAccount());

  /** Bumped after a change of password, to empty the form. */
  let passwordForm = $state(0);
  let deleteOpen = $state(false);

  return {
    get me() {
      return me;
    },
    get isLoading() {
      return meQuery.isLoading;
    },
    get isError() {
      return meQuery.isError;
    },
    get access() {
      return accessQuery.data;
    },
    get accessLoading() {
      return accessQuery.isLoading;
    },
    get accessError() {
      return accessQuery.isError;
    },
    /** The role of the first system grant, for the identity card. */
    get systemRole() {
      return systemRole;
    },

    get isSavingProfile() {
      return profileUpdate.isPending;
    },
    /** The email is the administrator's: it is never sent from here. */
    saveProfile: (values: ProfileValues) => {
      const changes = me && profileChanges(me, values, false);
      if (changes) profileUpdate.mutate(changes);
    },

    get passwordForm() {
      return passwordForm;
    },
    get isChangingPassword() {
      return passwordChange.isPending;
    },
    /** The message of the server for a wrong current password. */
    get passwordRefusal() {
      return passwordChange.data ?? undefined;
    },
    changePassword: (currentPassword: string, newPassword: string) =>
      passwordChange.mutate(
        { currentPassword, newPassword },
        {
          onSuccess: refusal => {
            if (refusal !== null) return;
            toast.success(i18n._(userMessages.passwordChanged));
            passwordForm += 1;
          },
        },
      ),

    get sessions() {
      return sessionsQuery.data;
    },
    get sessionsLoading() {
      return sessionsQuery.isLoading;
    },
    get sessionsError() {
      return sessionsQuery.isError;
    },
    get isRevokingSession() {
      return oneSessionRevocation.isPending;
    },
    revokeSession: (sessionId: string) => {
      if (me) oneSessionRevocation.mutate({ userId: me.userId, sessionId });
    },
    get isRevokingSessions() {
      return sessionRevocation.isPending;
    },
    signOutOtherSessions: () => {
      if (!me) return;
      sessionRevocation.mutate(me.userId, {
        onSuccess: count => toast.success(i18n._(userMessages.sessionsRevoked(count))),
      });
    },

    get deleteOpen() {
      return deleteOpen;
    },
    get isDeletingAccount() {
      return accountDeletion.isPending;
    },
    /** The message of the server: a wrong password, or the organizations to hand over first. */
    get deleteRefusal() {
      return accountDeletion.data ?? undefined;
    },
    openDelete: () => {
      accountDeletion.reset();
      deleteOpen = true;
    },
    closeDelete: () => {
      deleteOpen = false;
    },
    /** On success the mutation signs out: see `userMutations.deleteAccount`. */
    deleteAccount: (password: string) => accountDeletion.mutate(password),
  };
};

export type AccountPage = ReturnType<typeof createAccountPage>;

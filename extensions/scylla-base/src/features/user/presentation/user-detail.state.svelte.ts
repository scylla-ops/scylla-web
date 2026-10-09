import { i18n } from '@lingui/core';
import { can, Permission } from '@platform/authz';
import { createResourceError, scyllaNavigate } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toast } from '@scylla/ui/utils';
import type { PasswordResetDelivery } from '@base/features/login';
import { profileChanges, type ProfileValues } from '../domain/entities/user.entity.ts';
import { userMessages } from './ui/user.messages.ts';
import { userMutations, userQueries } from './user.queries.ts';

/**
 * The page of another user, for an administrator. The page needs READ_USER, and each action the
 * permission of its RPC, at system scope: a user is a system resource.
 */
export const createUserDetail = (userId: () => string | undefined) => {
  const meQuery = createQuery(() => userQueries.me());
  /** The own account has its own page: this one sends it there. */
  const isSelf = $derived(!!userId() && meQuery.data?.userId === userId());

  /** The route has no permission (the own id must reach its redirect): the reads check it. */
  const canRead = $derived(can(Permission.READ_USER));

  const userQuery = createQuery(() => userQueries.byId(userId(), { enabled: !isSelf && canRead }));
  const user = $derived(userQuery.data);
  const accessQuery = createQuery(() =>
    userQueries.access(userId(), { enabled: !isSelf && canRead }),
  );
  const sessionsQuery = createQuery(() =>
    userQueries.sessions(userId(), { enabled: !isSelf && canRead }),
  );

  const resourceError = createResourceError({
    error: () => userQuery.error,
    redirectTo: '..',
    notFoundMessage: t(userMessages.userNotFound),
  });

  const profileUpdate = createMutation(() => userMutations.update());
  const resetLink = createMutation(() => userMutations.sendPasswordReset());
  const sessionRevocation = createMutation(() => userMutations.revokeSessions());
  const oneSessionRevocation = createMutation(() => userMutations.revokeSession());
  const statusChange = createMutation(() => userMutations.setActive());
  const removal = createMutation(() => userMutations.remove());

  const canUpdate = $derived(can(Permission.UPDATE_USER));
  /** The backend asks for `createUser` at system scope to change an email. */
  const canEditEmail = $derived(canUpdate && can(Permission.CREATE_USER));
  const canDelete = $derived(can(Permission.DELETE_USER));

  let confirmStatusChange = $state(false);
  let confirmDelete = $state(false);

  const resetLinkToast = (delivery: PasswordResetDelivery): string => {
    if (delivery === 'mail' && user?.email)
      return i18n._(userMessages.resetLinkSentByMail(user.email));
    if (delivery === 'server-log') return i18n._(userMessages.resetLinkInServerLog);
    return i18n._(userMessages.resetLinkMade);
  };

  return {
    get isSelf() {
      return isSelf;
    },
    /** The own id is not known yet: the page cannot tell self from other. */
    get resolvingSelf() {
      return meQuery.isLoading;
    },
    get user() {
      return user;
    },
    get isLoading() {
      return userQuery.isLoading;
    },
    get isError() {
      return userQuery.isError;
    },
    get redirecting() {
      return resourceError.redirecting;
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
    get sessions() {
      return sessionsQuery.data;
    },
    get sessionsLoading() {
      return sessionsQuery.isLoading;
    },
    get sessionsError() {
      return sessionsQuery.isError;
    },

    get canUpdate() {
      return canUpdate;
    },
    get canEditEmail() {
      return canEditEmail;
    },
    get canDelete() {
      return canDelete;
    },
    /** True while one of the security actions runs. */
    get isBusy() {
      return resetLink.isPending || statusChange.isPending;
    },

    get isSavingProfile() {
      return profileUpdate.isPending;
    },
    saveProfile: (values: ProfileValues) => {
      const changes = user && profileChanges(user, values, canEditEmail);
      if (changes) profileUpdate.mutate(changes);
    },

    sendResetLink: () => {
      if (!user) return;
      resetLink.mutate(user.userId, {
        onSuccess: delivery => toast.success(resetLinkToast(delivery)),
      });
    },
    get isRevokingSession() {
      return oneSessionRevocation.isPending;
    },
    revokeSession: (sessionId: string) => {
      if (user) oneSessionRevocation.mutate({ userId: user.userId, sessionId });
    },
    get isRevokingSessions() {
      return sessionRevocation.isPending;
    },
    signOutEverywhere: () => {
      if (!user) return;
      sessionRevocation.mutate(user.userId, {
        onSuccess: count => toast.success(i18n._(userMessages.sessionsRevoked(count))),
      });
    },

    get confirmStatusChange() {
      return confirmStatusChange;
    },
    askStatusChange: (open = true) => {
      confirmStatusChange = open;
    },
    /** Deactivates an active user, reactivates a deactivated one. */
    changeStatus: () => {
      if (!user) return;
      const isActive = !user.isActive;
      statusChange.mutate(
        { userId: user.userId, isActive },
        {
          onSuccess: () =>
            toast.success(
              i18n._(isActive ? userMessages.accountReactivated : userMessages.accountDeactivated),
            ),
          // A refusal is toasted by the global handler: the dialog has nothing more to say.
          onSettled: () => (confirmStatusChange = false),
        },
      );
    },
    get isChangingStatus() {
      return statusChange.isPending;
    },

    get confirmDelete() {
      return confirmDelete;
    },
    askDelete: (open = true) => {
      confirmDelete = open;
    },
    remove: () => {
      if (!user) return;
      removal.mutate(user.userId, {
        onSuccess: () => scyllaNavigate.navigate('..'),
        onSettled: () => (confirmDelete = false),
      });
    },
    get isRemoving() {
      return removal.isPending;
    },
  };
};

export type UserDetail = ReturnType<typeof createUserDetail>;

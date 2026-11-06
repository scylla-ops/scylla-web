import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { contextStore } from '@platform/context';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import { PERSONAL_TOKENS_QUERY_KEY } from '@base/features/user';
import type { WorkspaceModule } from '../workspace.module.ts';
import { workspaceSettingsMessages } from './messages/workspace-settings.messages.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof WorkspaceModule.domain>('workspace').workspaceRepository;

export const WORKSPACES_QUERY_KEY = () => ['workspaces'] as const;
export const MY_WORKSPACES_QUERY_KEY = () => ['workspaces', 'mine'] as const;
export const WORKSPACE_MEMBERS_QUERY_KEY = (workspaceId: string) =>
  ['workspaces', workspaceId, 'members'] as const;

export const workspaceQueries = {
  /** Not the global list: non-admins may not read it. */
  mine: () =>
    queryOptions({
      queryKey: MY_WORKSPACES_QUERY_KEY(),
      queryFn: () => repository().getMine(),
      staleTime: 1000 * 60 * 5, // 5 minutes TODO: change
    }),

  /** Derived from grants: callers invalidate it with `invalidateWorkspaceMembers`. */
  members: (workspaceId: string | null, options: { enabled?: boolean } = {}) =>
    queryOptions({
      queryKey: WORKSPACE_MEMBERS_QUERY_KEY(workspaceId ?? ''),
      queryFn: () => repository().listMembers(workspaceId!),
      enabled: (options.enabled ?? true) && !!workspaceId,
    }),
};

export const invalidateWorkspaceMembers = (workspaceId: string | null): void => {
  if (!workspaceId) return;
  void getQueryClient().invalidateQueries({
    queryKey: WORKSPACE_MEMBERS_QUERY_KEY(workspaceId),
    exact: true,
  });
};

const invalidateWorkspaces = () =>
  getQueryClient().invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY() });

export const workspaceMutations = {
  create: () =>
    mutationOptions({
      mutationFn: ({ name, slug }: { name: string; slug?: string }) =>
        repository().create(name, slug),
      onSuccess: data => {
        // The new workspace becomes the active one.
        contextStore.getState().setWorkspace(data.id, data.name, data.slug);
        toast.success(i18n._(ToastMessages.WORKSPACE_CREATE));
        return invalidateWorkspaces();
      },
    }),

  update: () =>
    mutationOptions({
      mutationFn: ({
        workspaceId,
        name,
        slug,
      }: {
        workspaceId: string;
        name?: string;
        slug?: string;
      }) => repository().update(workspaceId, name, slug),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.WORKSPACE_UPDATE));
        // The data of other features also holds the name: members, roles, apps, notifications.
        return getQueryClient().invalidateQueries();
      },
    }),

  setPersonalTokens: () =>
    mutationOptions({
      mutationFn: ({ workspaceId, enabled }: { workspaceId: string; enabled: boolean }) =>
        repository().setPersonalTokens(workspaceId, enabled),
      onSuccess: (_workspace, { enabled }) => {
        toast.success(
          i18n._(
            enabled ? workspaceSettingsMessages.turnedOn : workspaceSettingsMessages.turnedOff,
          ),
        );
        void getQueryClient().invalidateQueries({ queryKey: PERSONAL_TOKENS_QUERY_KEY() });
        return invalidateWorkspaces();
      },
    }),

  remove: () =>
    mutationOptions({
      mutationFn: (workspaceId: string) => repository().delete(workspaceId),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.WORKSPACE_DELETE));
        return invalidateWorkspaces();
      },
    }),
};

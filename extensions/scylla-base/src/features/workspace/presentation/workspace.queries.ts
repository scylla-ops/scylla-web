import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { contextStore } from '@platform/context';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { CustomIconChange } from '@shared/domain/structs/custom-icon.struct.ts';
import { keepRecentColor } from '@base/features/project';
import { PERSONAL_TOKENS_QUERY_KEY } from '@base/features/user';
import type { WorkspaceEntity } from '../domain/entities/workspace.entity.ts';
import type { WorkspaceModule } from '../workspace.module.ts';
import { workspaceMessages } from './messages/workspace.messages.ts';
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

/** A free color of a saved icon goes first in the recent colors. */
const keepColorOf = (icon: CustomIconChange | undefined) => {
  if (icon?.kind === 'glyph') keepRecentColor(icon.color);
};

/**
 * `CreateWorkspace` has no icon: it goes in an `UpdateWorkspace` just after. The workspace stays
 * when only the icon fails, and a toast tells it.
 */
const createWithIcon = async (
  name: string,
  slug?: string,
  icon?: CustomIconChange,
): Promise<WorkspaceEntity> => {
  const created = await repository().create(name, slug);
  if (!icon) return created;
  try {
    return await repository().update(created.id, undefined, undefined, icon);
  } catch (error) {
    toast.error(i18n._(workspaceMessages.iconNotSaved(ScyllaError.from(error).userMessage())));
    return created;
  }
};

export const workspaceMutations = {
  create: () =>
    mutationOptions({
      mutationFn: ({ name, slug, icon }: { name: string; slug?: string; icon?: CustomIconChange }) =>
        createWithIcon(name, slug, icon),
      onSuccess: (data, { icon }) => {
        // The new workspace becomes the active one.
        contextStore.getState().setWorkspace(data.id, data.name, data.slug);
        toast.success(i18n._(ToastMessages.WORKSPACE_CREATE));
        if (data.icon) keepColorOf(icon);
        return invalidateWorkspaces();
      },
    }),

  update: () =>
    mutationOptions({
      mutationFn: ({
        workspaceId,
        name,
        slug,
        icon,
      }: {
        workspaceId: string;
        name?: string;
        slug?: string;
        icon?: CustomIconChange;
      }) => repository().update(workspaceId, name, slug, icon),
      onSuccess: (_workspace, { icon }) => {
        toast.success(i18n._(ToastMessages.WORKSPACE_UPDATE));
        keepColorOf(icon);
        // The data of other features also holds the name: members, roles, apps, notifications.
        return getQueryClient().invalidateQueries();
      },
    }),

  /** The switcher, the list of the workspaces and the settings show the new icon. */
  setIcon: () =>
    mutationOptions({
      mutationFn: ({ workspaceId, icon }: { workspaceId: string; icon: CustomIconChange }) =>
        repository().update(workspaceId, undefined, undefined, icon),
      onSuccess: (_workspace, { icon }) => {
        toast.success(i18n._(workspaceMessages.iconSaved));
        keepColorOf(icon);
        return invalidateWorkspaces();
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

  setTimeZone: () =>
    mutationOptions({
      mutationFn: ({ workspaceId, timeZone }: { workspaceId: string; timeZone: string }) =>
        repository().setTimeZone(workspaceId, timeZone),
      onSuccess: () => {
        toast.success(i18n._(workspaceSettingsMessages.timeZoneSaved));
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

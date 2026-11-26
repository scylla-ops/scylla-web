import { can, Permission } from '@platform/authz';
import { contextStore } from '@platform/context';
import { createMutation, createQuery } from '@scylla/core-sdk';
import { t } from '@scylla/ui/i18n';
import { toRune } from '@scylla/ui/stores';
import { toast } from '@scylla/ui/utils';
import { jobMutations, jobQueries } from '@base/features/jobs';
import { marketplaceQueries } from '@base/features/marketplace';
import { secretQueries } from '@base/features/secret';
import { triggerMutations, triggerQueries } from '@base/features/triggers';
import { canListUsers, userQueries } from '@base/features/user';
import { commandBarMessages as messages } from '@base/shell/presentation/layout/messages/command-bar.messages.ts';
import { filterGroups, type CommandFilter } from './command-results.presenter.ts';
import type { CommandGroupId, CommandRowActions, CommandSourcesData } from './command-row.ts';

/** The pause after the last key before the server search. */
export const SEARCH_PAUSE_MS = 200;
/** A shorter text finds too much: no server search, except a job number after `#`. */
export const SEARCH_MIN_LENGTH = 2;
/** The rows of each kind: the "All" tab shows the best few, a tab shows them all. */
export const SEARCH_LIMIT = 8;

/** The kinds that the server finds with the text of the bar. */
export const SERVER_GROUPS = ['jobs', 'triggers', 'secrets', 'users', 'packages'] as const;
export type ServerGroup = (typeof SERVER_GROUPS)[number];

/**
 * The text that a kind searches with, or `null`: no search. A tab with no text lists the newest
 * rows of its kind. `#` with a short text looks for a job number.
 */
export const searchTextFor = (
  group: ServerGroup,
  text: string,
  filter: CommandFilter | null,
): string | null => {
  if (filter && !filterGroups(filter).includes(group)) return null;
  if (text.length >= SEARCH_MIN_LENGTH) return text;
  if (filter && text === '') return '';
  if (filter && group === 'jobs') return text;
  return null;
};

interface Read {
  data?: unknown;
  isFetching: boolean;
  isError: boolean;
}

/**
 * The server search of the bar: the jobs, the triggers, the secrets of each project, the users of
 * the instance and the packages of the marketplace. Each kind reads only with the permission of
 * its pages, after a pause in the typing. A new text stops the call of the old one (the queries
 * pass their signal to the calls), and the old rows stay until the new ones come.
 */
export const createCommandSearch = (
  input: () => { search: string; filter: CommandFilter | null },
) => {
  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
  const target = $derived({ workspaceId: workspaceId ?? undefined });
  const typed = $derived({ text: input().search.trim(), filter: input().filter });

  let settled = $state<{ text: string; filter: CommandFilter | null }>({ text: '', filter: null });
  $effect(() => {
    const next = typed;
    const timer = setTimeout(() => (settled = next), SEARCH_PAUSE_MS);
    return () => clearTimeout(timer);
  });

  // The same permissions as the pages that the rows open.
  const allowed = $derived<Record<ServerGroup, boolean>>({
    jobs:
      !!workspaceId &&
      can(Permission.LIST_JOBS_BY_WORKSPACE, target) &&
      can(Permission.LIST_PIPELINES_BY_WORKSPACE, target),
    triggers: !!workspaceId && can(Permission.MANAGE_TRIGGERS, target),
    secrets: !!workspaceId && can(Permission.LIST_SECRETS, target),
    users: canListUsers(),
    packages: !!workspaceId && can(Permission.LIST_PIPELINES_BY_WORKSPACE, target),
  });

  const textNow = (group: ServerGroup) =>
    allowed[group] ? searchTextFor(group, typed.text, typed.filter) : null;
  const textSent = (group: ServerGroup) =>
    allowed[group] ? searchTextFor(group, settled.text, settled.filter) : null;

  const jobs = createQuery(() => ({
    ...jobQueries.search(workspaceId, textSent('jobs') ?? '', SEARCH_LIMIT, {
      enabled: textSent('jobs') !== null,
    }),
    notifyOnChangeProps: 'all' as const,
  }));
  const triggers = createQuery(() => ({
    ...triggerQueries.search(workspaceId, textSent('triggers') ?? '', SEARCH_LIMIT, {
      enabled: textSent('triggers') !== null,
    }),
    notifyOnChangeProps: 'all' as const,
  }));
  const secrets = createQuery(() => ({
    ...secretQueries.search(workspaceId, textSent('secrets') ?? '', SEARCH_LIMIT, {
      enabled: textSent('secrets') !== null,
    }),
    notifyOnChangeProps: 'all' as const,
  }));
  const users = createQuery(() => ({
    ...userQueries.search(textSent('users') ?? '', SEARCH_LIMIT, {
      enabled: textSent('users') !== null,
    }),
    notifyOnChangeProps: 'all' as const,
  }));
  // The marketplace is one list: the bar reads it once, and matches the text itself.
  const packages = createQuery(() => ({
    ...marketplaceQueries.list(),
    enabled: textSent('packages') !== null,
    notifyOnChangeProps: 'all' as const,
  }));

  const reads: Record<ServerGroup, Read> = { jobs, triggers, secrets, users, packages };

  /** The rows of a kind show while its text wants a search, and its first answer came. */
  const rowsOf = <T>(group: ServerGroup, data: T | undefined): T | undefined =>
    textNow(group) !== null && textSent(group) !== null ? data : undefined;

  /** A kind waits for the pause, or for its answer. The marketplace list has no text to wait for. */
  const busy = (group: ServerGroup): boolean => {
    const now = textNow(group);
    if (now === null) return false;
    const sent = textSent(group);
    return sent === null || (group !== 'packages' && sent !== now) || reads[group].isFetching;
  };

  const data = $derived<Partial<CommandSourcesData>>({
    jobs: rowsOf('jobs', jobs.data),
    triggers: rowsOf('triggers', triggers.data),
    workspaceSecrets: rowsOf('secrets', secrets.data),
    users: rowsOf('users', users.data),
    packages: rowsOf('packages', packages.data),
  });

  const rerun = createMutation(() => jobMutations.rerunJob());
  const toggle = createMutation(() => triggerMutations.setEnabledOf());
  const actions: CommandRowActions = {
    rerunJob: variables => rerun.mutateAsync(variables),
    setTriggerEnabled: variables => toggle.mutateAsync(variables),
    copyName: async name => {
      try {
        await navigator.clipboard.writeText(name);
        toast.success(t(messages.copied(name)));
      } catch {
        toast.error(t(messages.copyFailed));
      }
    },
  };

  return {
    get data() {
      return data;
    },
    /** The kinds that wait for the server: their sections show a small line. */
    get searching(): CommandGroupId[] {
      return SERVER_GROUPS.filter(busy);
    },
    get failed(): CommandGroupId[] {
      return SERVER_GROUPS.filter(group => textSent(group) !== null && reads[group].isError);
    },
    /** The kinds that the reader may search: their tabs show before their first rows. */
    get available(): CommandGroupId[] {
      return SERVER_GROUPS.filter(group => allowed[group]);
    },
    actions,
  };
};

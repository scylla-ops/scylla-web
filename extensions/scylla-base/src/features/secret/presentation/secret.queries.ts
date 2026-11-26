import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import type { SecretEntity, WorkspaceSecret } from '../domain/entities/secret.entity.ts';
import type { SecretUsage } from '../domain/structs/secret-usage.struct.ts';
import type { SecretModule } from '../secret.module.ts';

// Resolved per call: tests swap the registry.
const repository = () => getModuleDomain<typeof SecretModule.domain>('secret').secretRepository;

export const CREATE_SECRET_MUTATION_KEY = ['secret', 'create'] as const;

export const SECRETS_QUERY_KEY = (projectId: string) => ['secrets', projectId] as const;

/** Under the `'secrets'` root: a new or a deleted secret refreshes the results of a search. */
const SEARCH_SECRETS_QUERY_KEY = (workspaceId: string | null, text: string, limit: number) =>
  ['secrets', 'workspace', workspaceId, 'search', text, limit] as const;

const SECRET_USAGE_QUERY_KEY = (projectId: string, secretName: string) =>
  [...SECRETS_QUERY_KEY(projectId), 'pipelines', secretName] as const;

export interface CreateSecretValues {
  name: string;
  value: string;
}

export interface UpdateSecretValues {
  secretId: string;
  value: string;
}

export const secretQueries = {
  /** Metadata only. */
  byProject: (projectId: string) =>
    queryOptions<SecretEntity[]>({
      queryKey: SECRETS_QUERY_KEY(projectId),
      enabled: !!projectId,
      queryFn: () => repository().listByProjectId(projectId),
      staleTime: 30 * 1000,
    }),

  /**
   * The secrets of the workspace whose name or project name holds `text`: names only, never a
   * value. A new text stops the call of the old one, and the old results stay until the new ones
   * come. It needs LIST_SECRETS: the caller adds it to `enabled`.
   */
  search: (
    workspaceId: string | null,
    text: string,
    limit: number,
    options: { enabled?: boolean } = {},
  ) =>
    queryOptions<WorkspaceSecret[]>({
      queryKey: SEARCH_SECRETS_QUERY_KEY(workspaceId, text, limit),
      enabled: (options.enabled ?? true) && !!workspaceId,
      queryFn: ({ signal }) =>
        repository().searchWorkspace({ workspaceId: workspaceId!, text, limit }, signal),
      placeholderData: previous => previous,
      staleTime: 10_000,
    }),

  usage: (projectId: string, secretName: string, enabled: boolean) =>
    queryOptions<SecretUsage>({
      queryKey: SECRET_USAGE_QUERY_KEY(projectId, secretName),
      enabled: enabled && !!projectId && !!secretName,
      queryFn: () => repository().listPipelinesUsing(projectId, secretName),
      staleTime: 0,
    }),
};

const invalidateProject = (projectId: string) =>
  getQueryClient().invalidateQueries({ queryKey: SECRETS_QUERY_KEY(projectId) });

export const secretMutations = {
  /** The value passes through once and is never stored. */
  create: (projectId: string) =>
    mutationOptions({
      mutationKey: CREATE_SECRET_MUTATION_KEY,
      mutationFn: ({ name, value }: CreateSecretValues) =>
        repository().create({ projectId, name, value }),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.SECRET_CREATE));
        void invalidateProject(projectId);
      },
    }),

  update: (projectId: string) =>
    mutationOptions({
      mutationFn: (values: UpdateSecretValues) => repository().update(values),
      onSuccess: () => {
        toast.success(i18n._(ToastMessages.SECRET_UPDATE));
        void invalidateProject(projectId);
      },
    }),

  /** Breaks the pipelines that use it: confirm first. No success toast: each caller words its own. */
  remove: (projectId: string) =>
    mutationOptions({
      mutationFn: (secretId: string) => repository().deleteById(secretId),
      onSuccess: () => void invalidateProject(projectId),
    }),
};

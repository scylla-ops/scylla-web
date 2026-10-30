import { getQueryClient, mutationOptions, queryOptions, getModuleDomain } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { ToastMessages } from '@shared/utils/toast-messages.ts';
import type { SecretEntity } from '../domain/entities/secret.entity.ts';
import type { SecretUsage } from '../domain/structs/secret-usage.struct.ts';
import type { SecretModule } from '../secret.module.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof SecretModule.domain>('secret').secretRepository;

export const SECRETS_QUERY_KEY = (projectId: string) => ['secrets', projectId] as const;

const SECRET_USAGE_QUERY_KEY = (projectId: string, secretName: string) =>
  [...SECRETS_QUERY_KEY(projectId), 'pipelines', secretName] as const;

export interface CreateSecretValues {
  name: string;
  value: string;
  description: string;
}

export interface UpdateSecretValues {
  secretId: string;
  value?: string;
  description: string;
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
      mutationFn: ({ name, value, description }: CreateSecretValues) =>
        repository().create({ projectId, name, value, description }),
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

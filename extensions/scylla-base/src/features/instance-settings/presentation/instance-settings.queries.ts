import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { PERSONAL_TOKENS_QUERY_KEY } from '@base/features/user';
import type { InstanceSettingsModule } from '../instance-settings.module.ts';
import { instanceSettingsMessages as messages } from './messages/instance-settings.messages.ts';

// Resolved per call: tests swap the registry.
const repository = () =>
  getModuleDomain<typeof InstanceSettingsModule.domain>('instance-settings')
    .instanceSettingsRepository;

export const INSTANCE_SETTINGS_QUERY_KEY = () => ['instance-settings'] as const;

export const instanceSettingsQueries = {
  get: () =>
    queryOptions({
      queryKey: INSTANCE_SETTINGS_QUERY_KEY(),
      queryFn: () => repository().get(),
    }),
};

export const instanceSettingsMutations = {
  setPersonalTokens: () =>
    mutationOptions({
      mutationFn: (enabled: boolean) => repository().setPersonalTokens(enabled),
      onSuccess: (settings, enabled) => {
        toast.success(i18n._(enabled ? messages.turnedOn : messages.turnedOff));
        const client = getQueryClient();
        client.setQueryData(INSTANCE_SETTINGS_QUERY_KEY(), settings);
        return client.invalidateQueries({ queryKey: PERSONAL_TOKENS_QUERY_KEY() });
      },
    }),

  setWorkspaceLimit: () =>
    mutationOptions({
      mutationFn: (limit: number) => repository().setWorkspaceLimit(limit),
      onSuccess: settings => {
        toast.success(i18n._(messages.workspaceLimitSaved));
        getQueryClient().setQueryData(INSTANCE_SETTINGS_QUERY_KEY(), settings);
      },
    }),
};

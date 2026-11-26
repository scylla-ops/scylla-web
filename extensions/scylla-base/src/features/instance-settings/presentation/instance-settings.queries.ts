import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { PERSONAL_TOKENS_QUERY_KEY } from '@base/features/user';
import type { UpdateMailSettingsInput } from '../domain/entities/mail-settings.entity.ts';
import type { InstanceSettingsModule } from '../instance-settings.module.ts';
import { instanceSettingsMessages as messages } from './messages/instance-settings.messages.ts';
import { mailSettingsMessages } from './messages/mail-settings.messages.ts';

// Resolved per call: tests swap the registry.
const domain = () => getModuleDomain<typeof InstanceSettingsModule.domain>('instance-settings');
const repository = () => domain().instanceSettingsRepository;
const mailRepository = () => domain().mailSettingsRepository;

export const INSTANCE_SETTINGS_QUERY_KEY = () => ['instance-settings'] as const;
export const MAIL_SETTINGS_QUERY_KEY = () => ['mail-settings'] as const;

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

export const mailSettingsQueries = {
  get: () =>
    queryOptions({
      queryKey: MAIL_SETTINGS_QUERY_KEY(),
      queryFn: () => mailRepository().get(),
      // The page holds a draft of the relay: a refetch must not replace what the admin typed.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }),
};

export const mailSettingsMutations = {
  update: () =>
    mutationOptions({
      mutationFn: (input: UpdateMailSettingsInput) => mailRepository().update(input),
      onSuccess: settings => {
        toast.success(i18n._(mailSettingsMessages.saved));
        getQueryClient().setQueryData(MAIL_SETTINGS_QUERY_KEY(), settings);
      },
    }),

  reset: () =>
    mutationOptions({
      mutationFn: () => mailRepository().reset(),
      onSuccess: settings => {
        toast.success(i18n._(mailSettingsMessages.resetDone));
        getQueryClient().setQueryData(MAIL_SETTINGS_QUERY_KEY(), settings);
      },
    }),

  sendTest: () =>
    mutationOptions({
      mutationFn: (to: string) => mailRepository().sendTest(to),
    }),
};

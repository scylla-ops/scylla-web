import { getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { legalRepository } from '../legal-repository.ts';
import type { UpdateLegalSettingsInput } from '../domain/structs/legal-info.struct.ts';
import { legalMessages as messages } from './messages/legal.messages.ts';

export const LEGAL_INFO_QUERY_KEY = () => ['legal-info'] as const;

export const legalQueries = {
  /** Public: anyone reads it, with no session and no permission. */
  info: () =>
    queryOptions({
      queryKey: LEGAL_INFO_QUERY_KEY(),
      queryFn: () => legalRepository().info(),
      // The operator changes it seldom: one read for each page load is enough.
      staleTime: 5 * 60_000,
    }),
};

export const legalMutations = {
  /** Instance admins only: the route of the page checks `MANAGE_INSTANCE_SETTINGS`. */
  update: () =>
    mutationOptions({
      mutationFn: (input: UpdateLegalSettingsInput) => legalRepository().update(input),
      onSuccess: info => {
        toast.success(i18n._(messages.saved));
        getQueryClient().setQueryData(LEGAL_INFO_QUERY_KEY(), info);
      },
    }),
};

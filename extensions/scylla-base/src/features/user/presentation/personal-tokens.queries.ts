import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import type { CreateTokenInput } from '@shared/domain/structs/api-token.struct.ts';
import type { UserModule } from '../user.module.ts';
import { personalTokensMessages } from './messages/personal-tokens.messages.ts';

// Resolved per call: tests swap the registry.
const repository = () => getModuleDomain<typeof UserModule.domain>('user').userRepository;

export const PERSONAL_TOKENS_QUERY_KEY = () => ['personal-tokens'] as const;

const invalidate = () =>
  getQueryClient().invalidateQueries({ queryKey: PERSONAL_TOKENS_QUERY_KEY() });

export const personalTokenQueries = {
  /** The account of the session: it needs no right. */
  mine: () =>
    queryOptions({
      queryKey: PERSONAL_TOKENS_QUERY_KEY(),
      queryFn: () => repository().listPersonalTokens(),
    }),
};

export const personalTokenMutations = {
  create: () =>
    mutationOptions({
      mutationFn: (input: CreateTokenInput) => repository().createPersonalToken(input),
      onSuccess: () => invalidate(),
    }),

  revoke: () =>
    mutationOptions({
      mutationFn: (tokenId: string) => repository().revokePersonalToken(tokenId),
      onSuccess: () => {
        toast.success(i18n._(personalTokensMessages.revoked));
        return invalidate();
      },
    }),
};

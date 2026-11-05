import { getModuleDomain, getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { toast } from '@scylla/ui/utils';
import type { CreatedToken, CreateTokenInput } from '@shared/domain/structs/api-token.struct.ts';
import type { AppsModule } from '../apps.module.ts';
import type { CreatedApp } from '../domain/entities/app.entity.ts';
import type {
  CiIdentityEntity,
  CreateCiIdentityInput,
} from '../domain/entities/ci-identity.entity.ts';
import type { RoleGrant } from '../domain/structs/app-grants.struct.ts';
import { APPS_QUERY_ROOT } from './apps.queries.ts';
import { credentialsMessages } from './messages/credentials.messages.ts';

const repository = () => getModuleDomain<typeof AppsModule.domain>('apps').appsRepository;

/** How a new app signs in. A key pair joins with the join code of the new app. */
export type NewCredential =
  | { kind: 'token'; input: CreateTokenInput }
  | { kind: 'ci'; input: CreateCiIdentityInput }
  | { kind: 'keypair' };

export type ConnectionKind = NewCredential['kind'];

export interface NewAppWithCredential {
  name: string;
  grants: readonly RoleGrant[];
  credential: NewCredential;
}

export interface ReadyApp {
  created: CreatedApp;
  /** `false`: a role could not be given. The app exists. */
  rolesGranted: boolean;
  token?: CreatedToken;
  identity?: CiIdentityEntity;
}

export const APP_TOKENS_QUERY_KEY = (appId: string) =>
  [...APPS_QUERY_ROOT, 'tokens', appId] as const;
export const APP_CI_QUERY_KEY = (appId: string) => [...APPS_QUERY_ROOT, 'ci', appId] as const;
export const APP_CREDENTIALS_QUERY_KEY = (appId: string) =>
  [...APPS_QUERY_ROOT, 'credentials', appId] as const;

export const credentialQueries = {
  tokens: (appId: string, enabled = true) =>
    queryOptions({
      queryKey: APP_TOKENS_QUERY_KEY(appId),
      queryFn: () => repository().listTokens(appId),
      enabled: enabled && !!appId,
    }),

  ciIdentities: (appId: string, enabled = true) =>
    queryOptions({
      queryKey: APP_CI_QUERY_KEY(appId),
      queryFn: () => repository().listCiIdentities(appId),
      enabled: enabled && !!appId,
    }),

  /**
   * All the credentials of an app, for a line of the list. `null`: the user may list the apps but
   * not read this one, which is normal here: no error to show.
   */
  allOf: (appId: string, enabled = true) =>
    queryOptions({
      queryKey: APP_CREDENTIALS_QUERY_KEY(appId),
      queryFn: async () => {
        try {
          const [details, tokens, identities] = await Promise.all([
            repository().getApp(appId),
            repository().listTokens(appId),
            repository().listCiIdentities(appId),
          ]);
          return { tokens, identities, keys: details.keys };
        } catch (error) {
          if (ScyllaError.from(error).isForbidden()) return null;
          throw error;
        }
      },
      enabled: enabled && !!appId,
    }),
};

const invalidate = (queryKey: readonly unknown[]) =>
  getQueryClient().invalidateQueries({ queryKey });

const invalidateTokens = (appId: string) =>
  Promise.all([
    invalidate(APP_TOKENS_QUERY_KEY(appId)),
    invalidate(APP_CREDENTIALS_QUERY_KEY(appId)),
  ]);

const invalidateIdentities = (appId: string) =>
  Promise.all([invalidate(APP_CI_QUERY_KEY(appId)), invalidate(APP_CREDENTIALS_QUERY_KEY(appId))]);

export const credentialMutations = {
  /** Makes the app, gives its roles, then makes its first credential. */
  createApp: (workspaceId: string) =>
    mutationOptions({
      mutationFn: async ({ name, grants, credential }: NewAppWithCredential): Promise<ReadyApp> => {
        const created = await repository().createApp(workspaceId, name.trim(), false);
        let rolesGranted = true;
        try {
          await repository().grantRoles(workspaceId, created.app.id, grants);
        } catch {
          rolesGranted = false;
        }
        const token =
          credential.kind === 'token'
            ? await repository().createToken(created.app.id, credential.input)
            : undefined;
        const identity =
          credential.kind === 'ci'
            ? await repository().addCiIdentity(created.app.id, credential.input)
            : undefined;
        return { created, rolesGranted, token, identity };
      },
      onSuccess: () => invalidate(APPS_QUERY_ROOT),
    }),

  createToken: (appId: string) =>
    mutationOptions({
      mutationFn: (input: CreateTokenInput) => repository().createToken(appId, input),
      onSuccess: () => invalidateTokens(appId),
    }),

  revokeToken: (appId: string) =>
    mutationOptions({
      mutationFn: (tokenId: string) => repository().revokeToken(appId, tokenId),
      onSuccess: () => {
        toast.success(i18n._(credentialsMessages.tokenRevoked));
        return invalidateTokens(appId);
      },
    }),

  addCiIdentity: (appId: string) =>
    mutationOptions({
      mutationFn: (input: CreateCiIdentityInput) => repository().addCiIdentity(appId, input),
      onSuccess: () => invalidateIdentities(appId),
    }),

  removeCiIdentity: (appId: string) =>
    mutationOptions({
      mutationFn: (identityId: string) => repository().removeCiIdentity(appId, identityId),
      onSuccess: () => {
        toast.success(i18n._(credentialsMessages.identityRemoved));
        return invalidateIdentities(appId);
      },
    }),
};

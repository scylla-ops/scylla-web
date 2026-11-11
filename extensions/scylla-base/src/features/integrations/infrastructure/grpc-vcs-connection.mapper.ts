import {
  AccountKind as GrpcAccountKind,
  ConnectionState as GrpcConnectionState,
  DeliveryMode as GrpcDeliveryMode,
  VcsProvider as GrpcVcsProvider,
  type Repository as GrpcRepository,
  type VcsConnection as GrpcVcsConnection,
  type VcsProviderInfo as GrpcVcsProviderInfo,
} from '@base/generated/scylla/integrations/v1/vcs.ts';
import type {
  AccountKind,
  ConnectionState,
  DeliveryMode,
  ProviderRepository,
  VcsConnectionEntity,
} from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import type {
  VcsProvider,
  VcsProviderInfo,
} from '@base/features/integrations/domain/structs/vcs-provider.struct.ts';
import {
  idValue,
  timestampToIso,
  timestampToIsoOpt,
} from '@shared/infrastructure/grpc/wrappers.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';

/** `null` for a provider that this build does not know: a newer server. */
export function providerToDomain(provider: GrpcVcsProvider): VcsProvider | null {
  if (provider === GrpcVcsProvider.GITHUB) return 'github';
  if (provider === GrpcVcsProvider.GITLAB) return 'gitlab';
  return null;
}

/** A provider that this build does not know, where the answer is one item: refuse it. */
export function knownProvider(provider: GrpcVcsProvider): VcsProvider {
  const known = providerToDomain(provider);
  if (known) return known;
  throw new ScyllaError(`The Git provider ${provider} is not known to this client: update Scylla`, {
    code: 'UNSUPPORTED_RESPONSE',
    raw: true,
  });
}

const STATES: Partial<Record<GrpcConnectionState, ConnectionState>> = {
  [GrpcConnectionState.ACTIVE]: 'active',
  [GrpcConnectionState.SUSPENDED]: 'suspended',
  [GrpcConnectionState.NEEDS_ATTENTION]: 'needs_attention',
  [GrpcConnectionState.DISCONNECTED]: 'disconnected',
};

/** A state that this build does not know needs a person: it reads as `needs_attention`. */
export const stateToDomain = (state: GrpcConnectionState): ConnectionState =>
  STATES[state] ?? 'needs_attention';

export const deliveryModeToDomain = (mode: GrpcDeliveryMode): DeliveryMode =>
  mode === GrpcDeliveryMode.POLLING ? 'polling' : 'webhook';

const ACCOUNT_KINDS: Partial<Record<GrpcAccountKind, AccountKind>> = {
  [GrpcAccountKind.ORGANIZATION]: 'organization',
  [GrpcAccountKind.SERVICE_ACCOUNT]: 'service_account',
};

const accountKindToDomain = (kind: GrpcAccountKind): AccountKind => ACCOUNT_KINDS[kind] ?? 'user';

export function toDomain(
  connection: GrpcVcsConnection,
  provider: VcsProvider = knownProvider(connection.provider),
): VcsConnectionEntity {
  const tokenExpiresAt = timestampToIsoOpt(connection.tokenExpiresAt);
  return {
    id: idValue(connection.id),
    workspaceId: idValue(connection.workspaceId),
    provider,
    account: connection.account,
    accountKind: accountKindToDomain(connection.accountKind),
    avatarUrl: connection.avatarUrl,
    state: stateToDomain(connection.state),
    stateReason: connection.stateReason,
    deliveryMode: deliveryModeToDomain(connection.deliveryMode),
    pollIntervalSeconds: connection.pollIntervalSeconds,
    allRepositories: connection.allRepositories,
    repositoryCount: connection.repositoryCount,
    projectCount: connection.projectCount,
    ...(tokenExpiresAt ? { tokenExpiresAt } : {}),
    scopes: connection.scopes,
    missingPermissions: connection.missingPermissions,
    settingsUrl: connection.settingsUrl,
    createdBy: idValue(connection.createdBy),
    createdAt: timestampToIso(connection.createdAt),
  };
}

/** The connections of the providers that this build knows. */
export const listToDomain = (connections: GrpcVcsConnection[]): VcsConnectionEntity[] =>
  connections.flatMap(connection => {
    const provider = providerToDomain(connection.provider);
    return provider ? [toDomain(connection, provider)] : [];
  });

export const providersToDomain = (providers: GrpcVcsProviderInfo[]): VcsProviderInfo[] =>
  providers.flatMap(info => {
    const provider = providerToDomain(info.provider);
    return provider
      ? [
          {
            provider,
            available: info.available,
            unavailableReason: info.unavailableReason,
            webUrl: info.webUrl,
          },
        ]
      : [];
  });

export function repositoryToDomain(repository: GrpcRepository): ProviderRepository {
  const linkedProjectId = idValue(repository.linkedProjectId);
  return {
    externalId: repository.externalId,
    fullName: repository.fullName,
    webUrl: repository.webUrl,
    defaultBranch: repository.defaultBranch,
    private: repository.private,
    role: repository.role,
    ...(linkedProjectId ? { linkedProjectId } : {}),
  };
}

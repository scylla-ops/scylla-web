import {
  GitRefKind as GrpcGitRefKind,
  PipelineSource as GrpcPipelineSource,
  type GitRefInfo,
  type RepositoryLink as GrpcRepositoryLink,
} from '@base/generated/scylla/integrations/v1/vcs.ts';
import type {
  GitRef,
  GitRefKind,
  RepositoryLink,
} from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import {
  idValue,
  timestampToIso,
  timestampToIsoOpt,
} from '@shared/infrastructure/grpc/wrappers.ts';
import {
  deliveryModeToDomain,
  knownProvider,
  stateToDomain,
} from './grpc-vcs-connection.mapper.ts';

export const refKindToProto = (kind: GitRefKind | undefined): GrpcGitRefKind => {
  if (kind === 'branch') return GrpcGitRefKind.BRANCH;
  if (kind === 'tag') return GrpcGitRefKind.TAG;
  return GrpcGitRefKind.UNSPECIFIED;
};

export function toDomain(link: GrpcRepositoryLink): RepositoryLink {
  const lastEventAt = timestampToIsoOpt(link.lastEventAt);
  return {
    projectId: idValue(link.projectId),
    workspaceId: idValue(link.workspaceId),
    connectionId: idValue(link.connectionId),
    provider: knownProvider(link.provider),
    account: link.account,
    externalId: link.externalId,
    fullName: link.fullName,
    webUrl: link.webUrl,
    defaultBranch: link.defaultBranch,
    private: link.private,
    pipelineSource: link.pipelineSource === GrpcPipelineSource.FILE ? 'file' : 'editor',
    reportsEnabled: link.reportsEnabled,
    deliveryMode: deliveryModeToDomain(link.deliveryMode),
    pollIntervalSeconds: link.pollIntervalSeconds,
    ...(lastEventAt ? { lastEventAt } : {}),
    state: stateToDomain(link.state),
    stateReason: link.stateReason,
    createdBy: idValue(link.createdBy),
    createdAt: timestampToIso(link.createdAt),
  };
}

/** A ref of a kind that this build does not know is not in the list. */
export const refsToDomain = (refs: GitRefInfo[]): GitRef[] =>
  refs.flatMap(ref => {
    const kind: GitRefKind | null =
      ref.kind === GrpcGitRefKind.BRANCH
        ? 'branch'
        : ref.kind === GrpcGitRefKind.TAG
          ? 'tag'
          : null;
    return kind
      ? [
          {
            name: ref.name,
            kind,
            sha: ref.sha,
            defaultBranch: ref.defaultBranch,
            webUrl: ref.webUrl,
          },
        ]
      : [];
  });

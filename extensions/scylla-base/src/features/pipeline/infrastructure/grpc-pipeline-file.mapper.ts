import type { CommitRef } from '../domain/structs/commit-ref.struct.ts';
import type {
  CheckoutSettings,
  FileError,
  FileRules,
  PipelineFile,
  PullRequestEvent,
} from '../domain/structs/pipeline-file.struct.ts';
import type { PipelineFileFormat } from '../domain/structs/pipeline-file-format.struct.ts';
import {
  PipelineFileFormat as GrpcPipelineFileFormat,
  type PipelineFile as GrpcPipelineFile,
} from '@base/generated/scylla/pipelines/v1/pipeline_file.ts';
import type {
  CheckoutSettings as GrpcCheckoutSettings,
  FileError as GrpcFileError,
  GitRef,
} from '@base/generated/scylla/pipelines/v1/source.ts';
import { PullRequestEvent as GrpcPullRequestEvent } from '@base/generated/scylla/pipelines/v1/trigger.ts';
import { nodeToDomain } from './grpc-pipeline.mapper.ts';

export function refToProto(ref: CommitRef): GitRef {
  switch (ref.kind) {
    case 'branch':
      return { kind: { oneofKind: 'branch', branch: ref.name } };
    case 'tag':
      return { kind: { oneofKind: 'tag', tag: ref.name } };
    case 'sha':
      return { kind: { oneofKind: 'sha', sha: ref.sha.trim() } };
  }
}

const FORMATS: Partial<Record<GrpcPipelineFileFormat, PipelineFileFormat>> = {
  [GrpcPipelineFileFormat.TOML]: 'toml',
  [GrpcPipelineFileFormat.YAML]: 'yaml',
  [GrpcPipelineFileFormat.JSON]: 'json',
};

const PULL_REQUEST_EVENTS: Partial<Record<GrpcPullRequestEvent, PullRequestEvent>> = {
  [GrpcPullRequestEvent.OPENED]: 'opened',
  [GrpcPullRequestEvent.SYNCHRONIZED]: 'new_commits',
  [GrpcPullRequestEvent.REOPENED]: 'reopened',
  [GrpcPullRequestEvent.READY_FOR_REVIEW]: 'ready_for_review',
};

export const errorToDomain = (error: GrpcFileError): FileError => ({
  path: error.path,
  line: error.line,
  column: error.column,
  field: error.field,
  message: error.message,
  warning: error.warning,
});

const checkoutToDomain = (checkout: GrpcCheckoutSettings): CheckoutSettings => ({
  enabled: checkout.enabled,
  depth: checkout.depth,
  submodules: checkout.submodules,
  lfs: checkout.lfs,
});

/** An event this build does not know is left out of the list. */
const rulesToDomain = ({ push, pullRequest, tag }: GrpcPipelineFile): FileRules => ({
  ...(push && {
    push: {
      branches: push.branches,
      excludeBranches: push.excludeBranches,
      skipCi: push.skipCi,
    },
  }),
  ...(pullRequest && {
    pullRequest: {
      branches: pullRequest.branches,
      events: pullRequest.events.flatMap(event => PULL_REQUEST_EVENTS[event] ?? []),
      drafts: pullRequest.drafts,
    },
  }),
  ...(tag && { tag: { patterns: tag.patterns } }),
});

export function fileToDomain(file: GrpcPipelineFile): PipelineFile {
  const format = FORMATS[file.format];
  return {
    key: file.key,
    path: file.file?.path ?? '',
    commitSha: file.file?.commitSha ?? '',
    url: file.file?.url ?? '',
    ...(format && { format }),
    content: file.content,
    name: file.name || file.key,
    nodes: file.nodes.map(nodeToDomain),
    ...(file.checkout && { checkout: checkoutToDomain(file.checkout) }),
    rules: rulesToDomain(file),
    errors: file.errors.map(errorToDomain),
  };
}

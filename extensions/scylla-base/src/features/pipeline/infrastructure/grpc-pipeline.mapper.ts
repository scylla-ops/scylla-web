import type {
  PipelineEntity,
  PipelineMetadata,
  PipelineOrigin,
} from '../domain/entities/pipeline.entity.ts';
import type {
  EnvEntry,
  Shell as NodeShell,
  PipelineNodeEntity,
} from '../domain/entities/pipeline-node.entity.ts';
import type { PipelineFileFormat } from '../domain/structs/pipeline-file-format.struct.ts';
import type { PipelineLayout } from '../domain/structs/pipeline-layout.struct.ts';
import type {
  EnvVar,
  Node,
  Pipeline,
  PipelineLayout as GrpcPipelineLayout,
} from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import { Shell } from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import { PipelineFileFormat as GrpcPipelineFileFormat } from '@base/generated/scylla/pipelines/v1/pipeline_file.ts';
import { PipelineSource } from '@base/generated/scylla/integrations/v1/vcs.ts';
import type { PaginatedList, PaginationParams } from '@scylla/ui/structs';
import {
  idValue,
  timestampToIso,
  timestampToIsoOpt,
} from '@shared/infrastructure/grpc/wrappers.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';

function shellFromProto(s: Shell): NodeShell {
  return s === Shell.BASH ? 'bash' : 'sh';
}

function shellToProto(s: NodeShell): Shell {
  return s === 'bash' ? Shell.BASH : Shell.SH;
}

const FILE_FORMATS: Record<PipelineFileFormat, GrpcPipelineFileFormat> = {
  toml: GrpcPipelineFileFormat.TOML,
  yaml: GrpcPipelineFileFormat.YAML,
  json: GrpcPipelineFileFormat.JSON,
};

export function fileFormatToProto(format: PipelineFileFormat): GrpcPipelineFileFormat {
  return FILE_FORMATS[format];
}

/** A oneof arm this build does not know: refuse the pipeline, or saving it would erase the arm on the server. */
class UnknownArmError extends ScyllaError {
  constructor(what: string) {
    super(`${what} uses a variant this client doesn't understand — update Scylla`, {
      code: 'UNSUPPORTED_RESPONSE',
      raw: true,
    });
  }
}

function envVarToDomain(e: EnvVar): EnvEntry {
  switch (e.value.oneofKind) {
    case 'secret':
      return { key: e.name, kind: 'secret', secretRef: e.value.secret };
    case 'literal':
      return { key: e.name, kind: 'literal', value: e.value.literal };
    default:
      throw new UnknownArmError(`Environment variable "${e.name}"`);
  }
}

function envVarFromDomain(entry: EnvEntry): EnvVar {
  if (entry.kind === 'secret') {
    return { name: entry.key, value: { oneofKind: 'secret', secret: entry.secretRef } };
  }
  return { name: entry.key, value: { oneofKind: 'literal', literal: entry.value } };
}

export function nodeToDomain(node: Node): PipelineNodeEntity {
  const base = {
    id: node.id,
    deps: node.needs,
    ...(node.workingDir ? { workingDir: node.workingDir } : {}),
    env: node.env.map(envVarToDomain),
    // 0 is the default of the server: one hour.
    ...(node.timeoutSeconds ? { timeoutSeconds: node.timeoutSeconds } : {}),
    ...(node.retries ? { retries: node.retries } : {}),
    ...(node.container?.image ? { image: node.container.image } : {}),
  };

  const step = node.step;
  if (step.oneofKind === 'script') {
    return {
      ...base,
      kind: 'script',
      script: step.script.source,
      shell: shellFromProto(step.script.shell),
    };
  }
  if (step.oneofKind === 'exec') {
    const [command = '', ...args] = step.exec.argv;
    return { ...base, kind: 'exec', command, args };
  }
  throw new UnknownArmError(`Node "${base.id}"`);
}

export function nodeFromDomain(node: PipelineNodeEntity): Node {
  return {
    id: node.id,
    needs: node.deps,
    workingDir: node.workingDir ?? '',
    env: node.env.map(envVarFromDomain),
    timeoutSeconds: node.timeoutSeconds ?? 0,
    retries: node.retries ?? 0,
    ...(node.image ? { container: { image: node.image } } : {}),
    step:
      node.kind === 'script'
        ? { oneofKind: 'script', script: { source: node.script, shell: shellToProto(node.shell) } }
        : { oneofKind: 'exec', exec: { argv: [node.command, ...node.args] } },
  };
}

export const layoutToDomain = (layout: GrpcPipelineLayout | undefined): PipelineLayout | null =>
  layout ? { ...(layout.start && { start: layout.start }), nodes: layout.nodes } : null;

export const layoutFromDomain = ({ start, nodes }: PipelineLayout): GrpcPipelineLayout => ({
  ...(start && { start }),
  nodes: { ...nodes },
});

export function toDomain(pipeline: Pipeline): PipelineEntity {
  return {
    id: idValue(pipeline.id),
    projectId: idValue(pipeline.projectId),
    name: pipeline.name,
    nodes: pipeline.nodes.map(nodeToDomain),
  };
}

/** A source this build does not know reads as the editor: its pipeline stays editable on the server's word. */
export function originOf(pipeline: Pipeline): PipelineOrigin {
  const archivedAt = timestampToIsoOpt(pipeline.archivedAt);
  const removedAt = timestampToIsoOpt(pipeline.removedAt);
  return {
    source: pipeline.source === PipelineSource.FILE ? 'file' : 'editor',
    filePath: pipeline.filePath,
    fileErrorCount: pipeline.fileErrorCount,
    ...(archivedAt && { archivedAt }),
    ...(removedAt && { removedAt }),
  };
}

export function toMetadata(pipeline: Pipeline): PipelineMetadata {
  return {
    id: idValue(pipeline.id),
    projectId: idValue(pipeline.projectId),
    name: pipeline.name,
    nodeCount: pipeline.nodes.length,
    createdAt: timestampToIso(pipeline.createdAt),
    updatedAt: timestampToIso(pipeline.updatedAt),
    origin: originOf(pipeline),
  };
}

/**
 * One page of the whole list. The server pages with tokens and has no count: the list is read
 * whole, then cut here, so that the page numbers of the UI stay.
 */
export function toMetadataPage(
  pipelines: Pipeline[],
  { page, pageSize }: PaginationParams,
): PaginatedList<PipelineMetadata> {
  const totalPages = Math.max(1, Math.ceil(pipelines.length / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: pipelines.slice(start, start + pageSize).map(toMetadata),
    pagination: {
      totalCount: pipelines.length,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

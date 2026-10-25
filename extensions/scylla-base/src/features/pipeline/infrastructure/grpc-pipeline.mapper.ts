import type { PipelineMetadata } from '../domain/structs/pipeline.struct.ts';
import type { EnvEntry, Shell as NodeShell } from '../domain/structs/node.struct.ts';
import type { PipelineNodeEntity } from '../domain/entities/pipeline-node.entity.ts';
import type { PipelineEntity } from '../domain/entities/pipeline.entity.ts';
import type {
  EnvVar,
  ListProjectPipelinesResponse,
  Pipeline,
  PipelineNode,
  PipelineSummary,
} from '@base/generated/scylla/pipeline/v1/pipeline.ts';
import { Shell } from '@base/generated/scylla/exec/v1/step.ts';
import type { PaginationInfo, PaginatedList } from '@scylla/ui/structs';
import { idValue, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';

function shellFromProto(s: Shell): NodeShell {
  return s === Shell.BASH ? 'bash' : 'sh';
}

function shellToProto(s: NodeShell): Shell {
  return s === 'bash' ? Shell.BASH : Shell.SH;
}

/** A oneof arm this build does not know: refuse the pipeline, or saving it would erase the arm on the server. */
class UnknownArmError extends Error {
  constructor(what: string) {
    super(`${what} uses a variant this client doesn't understand — update Scylla`);
  }
}

function envVarToDomain(e: EnvVar): EnvEntry {
  switch (e.source.oneofKind) {
    case 'secretRef':
      return { key: e.key, kind: 'secret', secretRef: e.source.secretRef };
    case 'value':
      return { key: e.key, kind: 'literal', value: e.source.value };
    default:
      throw new UnknownArmError(`Environment variable "${e.key}"`);
  }
}

function envVarFromDomain(entry: EnvEntry): EnvVar {
  if (entry.kind === 'secret') {
    return { key: entry.key, source: { oneofKind: 'secretRef', secretRef: entry.secretRef } };
  }
  return { key: entry.key, source: { oneofKind: 'value', value: entry.value } };
}

type PipelineListResponse = Pick<ListProjectPipelinesResponse, 'pipelines' | 'pagination'>;

export class GrpcPipelineMapper {
  private static nodeToDomain(node: PipelineNode): PipelineNodeEntity {
    const base = {
      id: idValue(node.nodeId),
      deps: node.deps.map(idValue),
      ...(node.workingDir ? { workingDir: node.workingDir } : {}),
      env: node.env.map(envVarToDomain),
    };

    const step = node.step;
    if (step.oneofKind === 'script') {
      return {
        ...base,
        kind: 'script',
        script: step.script.script,
        shell: shellFromProto(step.script.shell),
      };
    }
    if (step.oneofKind === 'exec') {
      return {
        ...base,
        kind: 'exec',
        command: step.exec.command,
        args: step.exec.args,
      };
    }
    throw new UnknownArmError(`Node "${base.id}"`);
  }

  static nodeFromDomain(node: PipelineNodeEntity): PipelineNode {
    return {
      nodeId: wrapId(node.id),
      deps: node.deps.map(wrapId),
      workingDir: node.workingDir ?? '',
      env: node.env.map(envVarFromDomain),
      step:
        node.kind === 'script'
          ? {
              oneofKind: 'script',
              script: { script: node.script, shell: shellToProto(node.shell) },
            }
          : {
              oneofKind: 'exec',
              exec: { command: node.command, args: node.args },
            },
    };
  }

  static toDomain(pipeline: Pipeline): PipelineEntity {
    return {
      id: idValue(pipeline.pipelineId),
      projectId: idValue(pipeline.projectId),
      name: pipeline.name,
      nodes: pipeline.nodes.map(GrpcPipelineMapper.nodeToDomain),
    };
  }

  private static toMetadata(pipeline: PipelineSummary): PipelineMetadata {
    return {
      id: idValue(pipeline.pipelineId),
      projectId: idValue(pipeline.projectId),
      name: pipeline.name,
      nodeCount: pipeline.nodeCount,
      createdAt: timestampToIso(pipeline.createdAt),
      updatedAt: timestampToIso(pipeline.updatedAt),
    };
  }

  /** The project and organization listings share this shape. */
  static toMetadataList(pipelines: PipelineListResponse): PaginatedList<PipelineMetadata> {
    return {
      items: pipelines.pipelines.map(GrpcPipelineMapper.toMetadata),
      pagination: pipelines.pagination as PaginationInfo,
    };
  }
}

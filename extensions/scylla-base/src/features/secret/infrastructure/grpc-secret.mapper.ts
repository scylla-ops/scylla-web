import type { Secret as ProtoSecret } from '@base/generated/scylla/projects/v1/secret.ts';
import type { Pipeline } from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import type { SecretEntity } from '@base/features/secret/domain/entities/secret.entity.ts';
import type { SecretUsage } from '@base/features/secret/domain/structs/secret-usage.struct.ts';
import { idValue, timestampToIso } from '@shared/infrastructure/grpc/wrappers.ts';

/** How many pipeline names the dialog lists; the count says the rest. */
const SHOWN = 10;

export function toDomain(s: ProtoSecret): SecretEntity {
  return {
    id: idValue(s.id),
    projectId: idValue(s.projectId),
    name: s.name,
    createdAt: timestampToIso(s.createdAt),
    updatedAt: timestampToIso(s.updatedAt),
  };
}

/** A pipeline uses a secret when a variable of one of its nodes names it. */
const uses = (pipeline: Pipeline, secretName: string): boolean =>
  pipeline.nodes.some(node =>
    node.env.some(
      variable => variable.value.oneofKind === 'secret' && variable.value.secret === secretName,
    ),
  );

export function usageToDomain(pipelines: Pipeline[], secretName: string): SecretUsage {
  const using = pipelines.filter(pipeline => uses(pipeline, secretName));
  return {
    pipelines: using.slice(0, SHOWN).map(pipeline => ({
      id: idValue(pipeline.id),
      name: pipeline.name,
    })),
    totalCount: using.length,
  };
}

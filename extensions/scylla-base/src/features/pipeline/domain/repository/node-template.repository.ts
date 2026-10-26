import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { NodeTemplateEntity } from '@base/features/pipeline/domain/entities/node-template.entity.ts';

export interface NodeTemplateRepository {
  list(): Promise<ScyllaResult<NodeTemplateEntity[]>>;
}

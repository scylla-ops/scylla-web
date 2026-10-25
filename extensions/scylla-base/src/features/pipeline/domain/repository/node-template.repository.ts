import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { NodeTemplate } from '@base/features/pipeline/domain/structs/node-template.struct.ts';

export interface NodeTemplateRepository {
  list(): Promise<ScyllaResult<NodeTemplate[]>>;
}

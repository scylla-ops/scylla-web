import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { StepTemplate } from '@base/features/pipeline/domain/structs/step-template.struct.ts';

export interface StepTemplateRepository {
  list(): Promise<ScyllaResult<StepTemplate[]>>;
}

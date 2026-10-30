import type { NodeTemplateEntity } from '@base/features/pipeline/domain/entities/node-template.entity.ts';

export interface NodeTemplateRepository {
  list(): Promise<NodeTemplateEntity[]>;
}

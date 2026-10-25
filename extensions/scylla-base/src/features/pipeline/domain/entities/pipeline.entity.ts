import type { PipelineIdentity } from '../structs/pipeline.struct.ts';
import type { PipelineIssue, PipelineNameIssue } from '../structs/pipeline-issue.struct.ts';
import { nodeIdIssue, type PipelineStepEntity } from './pipeline-step.entity.ts';

export interface PipelineEntity extends PipelineIdentity {
  nodes: PipelineStepEntity[];
}

/** The name goes into the breadcrumb and the URLs: it is a single word. */
export const pipelineNameIssue = (name: string): PipelineNameIssue | null => {
  const trimmed = name.trim();
  if (!trimmed) return 'empty';
  return /\s/.test(trimmed) ? 'spaces' : null;
};

/** The first reason the pipeline cannot be saved, or `null`. The server refuses the whole pipeline for one step id. */
export const pipelineIssue = ({
  name,
  nodes,
}: Pick<PipelineEntity, 'name' | 'nodes'>): PipelineIssue | null => {
  const nameIssue = pipelineNameIssue(name);
  if (nameIssue) return { kind: 'name', issue: nameIssue };

  const ids = nodes.filter(step => nodeIdIssue(step.id)).map(step => step.id);
  return ids.length ? { kind: 'step-ids', ids } : null;
};

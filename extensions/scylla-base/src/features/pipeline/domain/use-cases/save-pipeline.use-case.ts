import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { PipelineRepository } from '../repository/pipeline.repository.ts';
import { pipelineIssue } from '../entities/pipeline.entity.ts';
import type { PipelineNodeEntity } from '../entities/pipeline-node.entity.ts';
import type { PipelineIssue } from '../entities/pipeline.entity.ts';
import type { PipelineLayout } from '../structs/pipeline-layout.struct.ts';

export interface SavePipelineInput {
  /** None for a new pipeline. */
  id?: string;
  projectId: string;
  name: string;
  nodes: PipelineNodeEntity[];
  /** The places of the nodes that the server does not hold yet. */
  layout?: PipelineLayout;
}

/** The pipeline breaks a rule of the domain: nothing was sent to the server. */
export class InvalidPipelineError extends ScyllaError {
  constructor(public readonly issue: PipelineIssue) {
    super(`The pipeline cannot be saved: ${issue.kind}`, { code: 'INVALID_ARGUMENT' });
  }
}

/**
 * Applies the rules of the server before it is called: a name of one word, node ids, switches and
 * needs that it accepts. Then creates the pipeline, or edits it.
 */
export class SavePipelineUseCase {
  constructor(private readonly _repository: PipelineRepository) {}

  public async execute({ id, projectId, name, nodes, layout }: SavePipelineInput): Promise<void> {
    const issue = pipelineIssue({ name, nodes });
    if (issue) throw new InvalidPipelineError(issue);

    if (id) await this._repository.edit(id, nodes, name, layout);
    else await this._repository.create({ projectId, name, nodes }, layout);
  }
}

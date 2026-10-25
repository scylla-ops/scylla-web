import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PipelineRepository } from '../repository/pipeline.repository.ts';
import { pipelineIssue } from '../entities/pipeline.entity.ts';
import type { PipelineStepEntity } from '../entities/pipeline-step.entity.ts';
import type { PipelineIssue } from '../entities/pipeline.entity.ts';

export interface SavePipelineInput {
  /** None for a new pipeline. */
  id?: string;
  projectId: string;
  name: string;
  steps: PipelineStepEntity[];
}

/** The pipeline breaks a rule of the domain: nothing was sent to the server. */
export class InvalidPipelineError extends ScyllaError {
  constructor(public readonly issue: PipelineIssue) {
    super(`The pipeline cannot be saved: ${issue.kind}`);
    Object.setPrototypeOf(this, InvalidPipelineError.prototype);
  }
}

/**
 * Applies the rules of the server before it is called: a name of one word, and step ids that it
 * accepts. Then creates the pipeline, or edits it.
 */
export class SavePipelineUseCase {
  constructor(private readonly _repository: PipelineRepository) {}

  public async execute({
    id,
    projectId,
    name,
    steps,
  }: SavePipelineInput): Promise<ScyllaResult<void>> {
    const issue = pipelineIssue({ name, steps });
    if (issue) return ScyllaResult.error(new InvalidPipelineError(issue));

    if (!id) return this._repository.create({ projectId, name, steps });
    return (await this._repository.edit(id, steps, name)).map(() => undefined);
  }
}

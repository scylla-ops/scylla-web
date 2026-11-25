import type {
  PipelineOrigin,
  PipelineSource,
} from '../../domain/entities/pipeline.entity.ts';

/** The Git events of a pipeline: push, pull request and tag. */
export interface GitEventsState {
  /** The project takes its pipelines from the files, and this pipeline comes from the editor. */
  needed: boolean;
  /** The Git events start runs: a workspace admin allowed them, or the project needs no opt-in. */
  allowed: boolean;
}

/**
 * In a project of files, the Git events of a Scylla pipeline start runs only after the opt-in of
 * a workspace admin: nobody reviews such a pipeline in a pull request. While the origin or the
 * source of the project is not known, no opt-in is needed: the server stays the judge.
 */
export const gitEventsState = (
  origin: PipelineOrigin | undefined,
  projectSource: PipelineSource | undefined,
): GitEventsState => {
  const needed = projectSource === 'file' && origin?.source === 'editor';
  return { needed, allowed: !needed || !!origin?.gitEventsAllowedAt };
};

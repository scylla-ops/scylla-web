/** A job the server placed on an agent, as the recent jobs show it. */
export interface AgentJob {
  id: string;
  pipelineId: string;
  /** `pending`, `running`, `completed`, `failed`, `cancelled`, `orphaned` or `unknown`. */
  status: string;
  createdAt: string;
  /** Unset before an agent starts it. */
  startedAt?: string;
  finishedAt?: string;
}

/** The name of a pipeline and its project: a job carries the pipeline id only. */
export interface PipelineName {
  id: string;
  projectId: string;
  name: string;
}

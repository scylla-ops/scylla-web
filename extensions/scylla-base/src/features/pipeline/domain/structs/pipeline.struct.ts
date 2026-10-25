export interface PipelineIdentity {
  id: string;
  projectId: string;
  name: string;
}

export interface PipelineMetadata extends PipelineIdentity {
  stepCount: number;
  createdAt: string;
  updatedAt: string;
}

export type Shell = 'sh' | 'bash';

/** An inline value, or the name of a project secret resolved at dispatch: the client never holds a secret value. */
export type EnvEntry =
  | { key: string; kind: 'literal'; value: string }
  | { key: string; kind: 'secret'; secretRef: string };

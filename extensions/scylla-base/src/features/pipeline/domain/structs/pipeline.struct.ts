export interface PipelineIdentity {
  id: string;
  projectId: string;
  name: string;
}

export interface PipelineMetadata extends PipelineIdentity {
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

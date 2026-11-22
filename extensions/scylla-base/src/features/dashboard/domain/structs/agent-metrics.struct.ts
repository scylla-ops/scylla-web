export interface AgentMetricsBucket {
  start: string;
  samples: number;
  cpuPercent: number;
  memoryBytes: number;
}

export interface AgentMetrics {
  buckets: AgentMetricsBucket[];
}

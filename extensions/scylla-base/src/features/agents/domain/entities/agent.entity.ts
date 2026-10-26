import type { AgentState } from '../structs/agent-state.struct.ts';

export interface AgentEntity {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
  connected: boolean;
  /** Empty if it never connected. */
  lastSeen: string;
  /** 0 while disconnected. */
  inFlight: number;
  /** `null` until the agent said hello. */
  host: AgentHost | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentHost {
  version: string;
  os: string;
  arch: string;
  hostname: string;
  /** `null` when the agent could not read it. */
  cpuCount: number | null;
  totalMemoryMb: number | null;
  reportedAt: string;
}

/**
 * Disabled first: the server closes the stream of a disabled agent. A job can stay in flight
 * after a disconnect, so an agent runs a job only while it is connected.
 */
export const agentStateOf = (
  agent: Pick<AgentEntity, 'isActive' | 'connected' | 'lastSeen' | 'inFlight'>,
): AgentState => {
  if (!agent.isActive) return 'disabled';
  if (!agent.lastSeen) return 'never';
  if (!agent.connected) return 'offline';
  return agent.inFlight > 0 ? 'running' : 'idle';
};

export interface AgentStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  orphaned: number;
  lastRunAt: string;
  /** Last 30 days, oldest first; days without a finished job are absent. */
  daily: DailyOutcome[];
  /** `null`: no job ran yet (not a 0 ms run). */
  medianDurationMs: number | null;
  p95DurationMs: number | null;
}

export interface DailyOutcome {
  day: string;
  completed: number;
  failed: number;
  cancelled: number;
  orphaned: number;
  medianDurationMs: number | null;
}

/** The secret is returned once, at creation, and never again. */
export interface CreatedAgent {
  agent: AgentEntity;
  secret: string;
}

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

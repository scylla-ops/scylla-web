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

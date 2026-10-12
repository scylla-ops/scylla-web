import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';

export type AgentState = 'idle' | 'running' | 'offline' | 'never' | 'disabled';

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

export const isOnline = (state: AgentState): boolean => state === 'idle' || state === 'running';

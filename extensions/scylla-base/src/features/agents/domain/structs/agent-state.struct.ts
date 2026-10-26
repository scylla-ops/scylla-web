export type AgentState = 'idle' | 'running' | 'offline' | 'never' | 'disabled';

export const isOnline = (state: AgentState): boolean => state === 'idle' || state === 'running';

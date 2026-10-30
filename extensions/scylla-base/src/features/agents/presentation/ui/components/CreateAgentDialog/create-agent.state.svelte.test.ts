// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import { liveStatusInterval } from './create-agent.state.svelte.ts';

const agent = (overrides: Partial<AgentEntity> = {}): AgentEntity => ({
  id: 'agent-new',
  organizationId: 'org-1',
  name: 'build-runner-02',
  isActive: true,
  connected: false,
  lastSeen: '',
  inFlight: 0,
  host: null,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('liveStatusInterval', () => {
  it('polls every 2 s while the agent has not connected', () => {
    expect(liveStatusInterval({ data: undefined, status: 'pending' })).toBe(2000);
    expect(liveStatusInterval({ data: agent(), status: 'success' })).toBe(2000);
  });

  it('stops once the agent connected', () => {
    expect(liveStatusInterval({ data: agent({ connected: true }), status: 'success' })).toBe(false);
    const seen = agent({ lastSeen: '2026-10-11T08:00:00.000Z' });
    expect(liveStatusInterval({ data: seen, status: 'success' })).toBe(false);
  });

  it('stops on an error, so a failed refetch does not show a toast every 2 s', () => {
    expect(liveStatusInterval({ data: undefined, status: 'error' })).toBe(false);
    expect(liveStatusInterval({ data: agent(), status: 'error' })).toBe(false);
  });
});

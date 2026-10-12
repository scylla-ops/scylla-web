// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { agentStateOf, isOnline } from '../agent-state.struct.ts';

const agent = (overrides: Partial<Parameters<typeof agentStateOf>[0]> = {}) => ({
  isActive: true,
  connected: true,
  lastSeen: '2026-10-11T08:00:00.000Z',
  inFlight: 0,
  ...overrides,
});

describe('agentStateOf', () => {
  it('is idle while connected with no job in flight', () => {
    expect(agentStateOf(agent())).toBe('idle');
  });

  it('is running while connected with a job in flight', () => {
    expect(agentStateOf(agent({ inFlight: 2 }))).toBe('running');
  });

  it('is offline once disconnected, even with jobs still counted in flight', () => {
    expect(agentStateOf(agent({ connected: false }))).toBe('offline');
    expect(agentStateOf(agent({ connected: false, inFlight: 1 }))).toBe('offline');
  });

  it('is never connected while last_seen is unset', () => {
    expect(agentStateOf(agent({ connected: false, lastSeen: '' }))).toBe('never');
  });

  it('is disabled whatever its connection says: the server closed its stream', () => {
    expect(agentStateOf(agent({ isActive: false }))).toBe('disabled');
    expect(agentStateOf(agent({ isActive: false, lastSeen: '' }))).toBe('disabled');
  });

  it('counts idle and running as online, nothing else', () => {
    expect(isOnline('idle')).toBe(true);
    expect(isOnline('running')).toBe(true);
    expect(isOnline('offline')).toBe(false);
    expect(isOnline('never')).toBe(false);
    expect(isOnline('disabled')).toBe(false);
  });
});

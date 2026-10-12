// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { AppSecretEntity, ResetAppSecret } from '@base/features/apps';
import { resetOutcomeOf } from '../reset-secret.state.svelte.ts';

const secret = (label: string): AppSecretEntity => ({
  id: label,
  appId: 'agent-1',
  label,
  enabled: true,
  createdAt: '',
  updatedAt: '',
});

const result = (overrides: Partial<ResetAppSecret>): ResetAppSecret => ({
  created: { credential: secret('reset-2026-10-11'), secret: 'plaintext' },
  revoked: [],
  kept: [],
  failed: [],
  ...overrides,
});

describe('resetOutcomeOf', () => {
  it('names the secrets it revoked', () => {
    expect(resetOutcomeOf(result({ revoked: [secret('default')] }))).toEqual({
      kind: 'revoked',
      labels: ['default'],
    });
  });

  it('names the secrets it kept on request', () => {
    expect(resetOutcomeOf(result({ kept: [secret('default'), secret('ci')] }))).toEqual({
      kind: 'kept',
      labels: ['default', 'ci'],
    });
  });

  it('says so when one revoke failed, even if others passed', () => {
    expect(
      resetOutcomeOf(result({ revoked: [secret('default')], failed: [secret('ci')] })),
    ).toEqual({ kind: 'failed' });
  });

  it('has nothing to report for an agent that had no secret', () => {
    expect(resetOutcomeOf(result({}))).toEqual({ kind: 'none' });
  });
});

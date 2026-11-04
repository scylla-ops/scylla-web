// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { credentialRows, daysUntil, lastUsedOf } from '../app-credentials.struct.ts';

const NOW = new Date('2026-11-04T00:00:00.000Z');
const limits = { preset: 'read_only' as const, actions: [], projectIds: [] };

const token = (
  id: string,
  createdAt: string,
  expiresAt: string,
  lastUsedAt = '',
  revokedAt = '',
) => ({
  id,
  name: id,
  hint: 'scya_...',
  createdBy: 'u-1',
  createdAt,
  expiresAt,
  lastUsedAt,
  revokedAt,
  limits,
});

const identity = {
  id: 'ci-1',
  provider: 'github' as const,
  issuer: '',
  repository: 'acme/api',
  gitRef: '',
  environment: '',
  limits,
  createdAt: '2026-11-01T00:00:00.000Z',
  lastUsedAt: '2026-11-03T12:00:00.000Z',
};

const key = {
  id: 'k-1',
  label: 'backup',
  createdAt: '2026-10-01T00:00:00.000Z',
  revokedAt: '',
  lastUsedAt: '',
};

describe('app credentials', () => {
  it('lists the tokens newest first, then the CI identities, then the keys', () => {
    const rows = credentialRows(
      [
        token('old', '2026-10-01T00:00:00.000Z', '2026-10-03T00:00:00.000Z'),
        token('new', '2026-11-01T00:00:00.000Z', '2026-11-10T00:00:00.000Z'),
      ],
      [identity],
      [key],
      NOW,
    );

    expect(rows.map(row => row.id)).toEqual(['new', 'old', 'ci-1', 'k-1']);
    expect(rows[0]).toMatchObject({ kind: 'token', state: 'soon' });
    expect(rows[1]).toMatchObject({ kind: 'token', state: 'expired' });
  });

  it('finds the credential of the latest sign-in', () => {
    const rows = credentialRows(
      [
        token(
          't',
          '2026-11-01T00:00:00.000Z',
          '2027-01-01T00:00:00.000Z',
          '2026-11-03T08:00:00.000Z',
        ),
      ],
      [identity],
      [key],
      NOW,
    );

    expect(lastUsedOf(rows)?.id).toBe('ci-1');
    expect(lastUsedOf(credentialRows([], [], [key], NOW))).toBeNull();
  });

  it('counts the whole days before a date', () => {
    expect(daysUntil('2026-11-13T12:00:00.000Z', NOW)).toBe(9);
    expect(daysUntil('2026-11-03T00:00:00.000Z', NOW)).toBe(-1);
  });
});

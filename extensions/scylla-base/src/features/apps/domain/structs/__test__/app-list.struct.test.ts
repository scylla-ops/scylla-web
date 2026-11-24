// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { credentialRows } from '../app-credentials.struct.ts';
import { appRolesOf, mainCredential } from '../app-list.struct.ts';

const NOW = new Date('2026-11-04T00:00:00.000Z');
const limits = { preset: 'read_only' as const, actions: [], projectIds: [] };

const token = (id: string, expiresAt: string, revokedAt = '') => ({
  id,
  name: id,
  hint: 'scya_...',
  createdBy: 'u-1',
  createdAt: '2026-10-01T00:00:00.000Z',
  expiresAt,
  lastUsedAt: '',
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
  lastUsedAt: '',
};

const key = (revokedAt = '') => ({
  id: 'k-1',
  label: 'backup',
  createdAt: '2026-10-01T00:00:00.000Z',
  revokedAt,
  lastUsedAt: '',
});

const LATER = '2027-06-01T00:00:00.000Z';
const SOON = '2026-11-10T00:00:00.000Z';
const PAST = '2026-10-03T00:00:00.000Z';

describe('appRolesOf', () => {
  const entry = (actorId: string, role: string) => ({ actorId, role });

  it('gives the workspace roles first, then the project roles by name', () => {
    const roles = appRolesOf('a', { name: 'acme', entries: [entry('a', 'member')] }, [
      { name: 'web', entries: [entry('a', 'viewer')] },
      { name: 'api', entries: [entry('a', 'editor'), entry('b', 'admin')] },
    ]);

    expect(roles).toEqual([
      { role: 'member', on: 'acme' },
      { role: 'editor', on: 'api' },
      { role: 'viewer', on: 'web' },
    ]);
  });

  it('gives nothing for an app with no role', () => {
    expect(appRolesOf('a', { name: 'acme', entries: [] }, [])).toEqual([]);
  });
});

describe('mainCredential', () => {
  const rows = (
    tokens: ReturnType<typeof token>[],
    identities: (typeof identity)[] = [],
    keys: ReturnType<typeof key>[] = [],
  ) => credentialRows(tokens, identities, keys, NOW);

  it('shows the token that needs attention first', () => {
    const shown = mainCredential(
      rows([token('ok', LATER), token('old', PAST), token('soon', SOON)]),
    );

    expect(shown?.row.id).toBe('old');
    expect(shown?.others).toBe(2);
  });

  it('shows a healthy token before a CI identity, and a CI identity before a key', () => {
    expect(mainCredential(rows([token('ok', LATER)], [identity], [key()]))?.row.id).toBe('ok');
    expect(mainCredential(rows([], [identity], [key()]))?.row.id).toBe('ci-1');
    expect(mainCredential(rows([], [], [key()]))?.row.id).toBe('k-1');
  });

  it('does not count what is revoked', () => {
    const revoked = token('gone', LATER, '2026-10-20T00:00:00.000Z');

    expect(mainCredential(rows([revoked], [], [key('2026-10-20T00:00:00.000Z')]))).toBeNull();
    expect(mainCredential(rows([revoked], [identity]))).toEqual({
      row: expect.objectContaining({ id: 'ci-1' }),
      others: 0,
    });
  });

  it('gives nothing for an app with no credential', () => {
    expect(mainCredential([])).toBeNull();
  });
});

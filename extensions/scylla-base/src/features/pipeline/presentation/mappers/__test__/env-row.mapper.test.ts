// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { toEnvEntry, toEnvRow } from '../env-row.mapper.ts';

describe('env-row mapper', () => {
  it('reads back a literal and a secret as they were', () => {
    const literal = { key: 'MODE', kind: 'literal' as const, value: 'ci' };
    const secret = { key: 'TOKEN', kind: 'secret' as const, secretRef: 'gh-token' };

    expect(toEnvEntry(toEnvRow(literal))).toEqual(literal);
    expect(toEnvEntry(toEnvRow(secret))).toEqual(secret);
  });

  it('keeps the other field of a row empty, so switching the kind starts clean', () => {
    expect(toEnvRow({ key: 'TOKEN', kind: 'secret', secretRef: 'gh-token' })).toEqual({
      key: 'TOKEN',
      kind: 'secret',
      value: '',
      secretRef: 'gh-token',
    });
  });

  it('writes only the field of the chosen kind', () => {
    expect(toEnvEntry({ key: 'K', kind: 'literal', value: 'v', secretRef: 'kept' })).toEqual({
      key: 'K',
      kind: 'literal',
      value: 'v',
    });
  });
});

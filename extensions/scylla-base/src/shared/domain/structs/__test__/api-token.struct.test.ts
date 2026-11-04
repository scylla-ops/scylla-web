// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { expiryStateOf } from '../api-token.struct.ts';

const NOW = new Date('2026-11-04T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();

describe('expiryStateOf', () => {
  it('warns 14 days before the end, and tells an end or a revocation', () => {
    expect(expiryStateOf({ expiresAt: at(30), revokedAt: '' }, NOW)).toBe('ok');
    expect(expiryStateOf({ expiresAt: at(14), revokedAt: '' }, NOW)).toBe('soon');
    expect(expiryStateOf({ expiresAt: at(-1), revokedAt: '' }, NOW)).toBe('expired');
    expect(expiryStateOf({ expiresAt: at(30), revokedAt: at(-2) }, NOW)).toBe('revoked');
  });
});

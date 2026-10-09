// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { fillPath } from '../route-path.ts';

describe('fillPath', () => {
  it('fills each parameter of the pattern, encoded', () => {
    expect(fillPath([':slug', 'users', ':id'], { slug: 'acme', id: 'a b' })).toBe(
      '/acme/users/a%20b',
    );
  });

  it('gives null when a parameter has no value', () => {
    expect(fillPath([':slug', 'users'], {})).toBeNull();
  });
});

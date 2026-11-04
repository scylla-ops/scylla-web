// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { bySpecificity, fillPath } from '../route-path.ts';

describe('bySpecificity', () => {
  it('puts a static path before a parameter, also with the root path in the list', () => {
    const paths = [[':slug'], [], ['login']];

    expect([...paths].sort(bySpecificity)).toEqual([[], ['login'], [':slug']]);
  });
});

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

// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { fromValue, toValue } from '../commit-ref.mapper.ts';

describe('commit-ref mapper', () => {
  it('reads back each ref that it writes, with a slash or a colon in its name', () => {
    const refs = [
      { kind: 'branch', name: 'release/2.1' },
      { kind: 'tag', name: 'v1:rc' },
      { kind: 'sha', sha: 'a1b2c3d' },
    ] as const;

    expect(refs.map(ref => fromValue(toValue(ref)))).toEqual(refs);
  });

  it('reads no ref from a value that no picker gives', () => {
    expect(fromValue('main')).toBeUndefined();
    expect(fromValue('branch:')).toBeUndefined();
    expect(fromValue('note:main')).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import type { FragmentSource } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import {
  acceptUpstream,
  canDecideUpstream,
  detachAsFork,
  dismissUpstream,
  pendingUpstream,
  pinnedValues,
  skipUpstream,
} from '../fragment-upstream.struct.ts';
import { literal, PACKAGE, usage, version } from './fragment-test-data.ts';

const linkedSource = (skipped: number[] = []): FragmentSource => ({
  kind: 'linked',
  package: PACKAGE,
  addedAt: '2026-10-01T10:00:00Z',
  upstream: [version(9), version(10)],
  skipped,
});

const linked = (skipped: number[] = []) => ({
  versions: [version(8)],
  source: linkedSource(skipped),
});

describe('fragment upstream', () => {
  it('waits on the newest version of the publisher that the workspace did not skip', () => {
    expect(pendingUpstream(linked())?.number).toBe(10);
    expect(pendingUpstream(linked([10]))?.number).toBe(9);
    expect(pendingUpstream(linked([9, 10]))).toBeNull();
    expect(pendingUpstream({ versions: [version(1)] })).toBeNull();
  });

  it('leaves the decision to the admins', () => {
    expect(canDecideUpstream({ admin: true })).toBe(true);
    expect(canDecideUpstream({ admin: false })).toBe(false);
  });

  it('moves an accepted version into the library', () => {
    const accepted = acceptUpstream(linked(), 10);

    expect(accepted.versions.map(entry => entry.number)).toEqual([8, 10]);
    expect(pendingUpstream(accepted)).toBeNull();
    expect(() => acceptUpstream(linked(), 11)).toThrow();
  });

  it('keeps a skipped version in the history of the publisher', () => {
    const skipped = skipUpstream(linked(), 10);

    expect(skipped.versions.map(entry => entry.number)).toEqual([8]);
    expect(skipped.source?.kind === 'linked' && skipped.source.upstream).toHaveLength(2);
  });

  it('turns a linked fragment into a fork on its latest version, the release still shown', () => {
    const fork = detachAsFork(linked());

    expect(fork.source).toEqual(
      expect.objectContaining({ kind: 'forked', baseVersion: 8, upstream: version(10) }),
    );
    expect(pendingUpstream(dismissUpstream(fork))).toBeNull();
    expect(() => dismissUpstream(linked())).toThrow();
  });

  it('finds the pipelines that keep their own value when a default changes', () => {
    const from = version(8);
    const to = version(9, { parameters: [literal('NODE_VERSION', '22')] });
    const usages = [
      usage('api'),
      usage('legacy-web', { NODE_VERSION: '18' }),
      usage('docs', { NODE_VERSION: '20' }),
    ];

    expect(pinnedValues(usages, from, to)).toEqual([
      { usage: usages[1], key: 'NODE_VERSION', value: '18' },
    ]);
    expect(pinnedValues(usages, from, version(9))).toEqual([]);
  });
});

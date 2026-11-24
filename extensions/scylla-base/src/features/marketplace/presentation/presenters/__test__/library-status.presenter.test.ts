import { describe, expect, it } from 'vitest';
import { cardBadge, libraryStatus } from '../library-status.presenter.ts';
import { libraryFragment, marketPackage, packageVersion } from './package-test-data.ts';

const PACKAGE_REF = {
  packageId: 'pnpm.node-ci',
  publisher: 'pnpm',
  name: 'node-ci',
  verified: true,
};

const linked = libraryFragment({
  source: { kind: 'linked', package: PACKAGE_REF, addedAt: '', upstream: [], skipped: [] },
});
const forked = libraryFragment({
  source: { kind: 'forked', package: PACKAGE_REF, addedAt: '', baseVersion: 8, upstream: null },
});
const published = libraryFragment({
  id: 'f2',
  name: 'rust-ci',
  versions: [packageVersion(1), packageVersion(2), packageVersion(3)],
  publication: {
    packageId: 'p-rust-ci',
    name: 'rust-ci',
    license: 'MIT',
    category: 'ci',
    versions: [2, 3],
    autoPublish: false,
    deprecated: [2],
    publishedAt: '2026-11-18T10:00:00Z',
    publishedBy: { id: 'rem', name: 'Rem' },
    stats: { stars: 12 },
  },
});

describe('library status', () => {
  it('finds a package in the library, linked on a version, or forked', () => {
    expect(libraryStatus(marketPackage(), [linked])).toEqual({
      kind: 'linked',
      fragment: linked,
      version: 8,
    });
    expect(libraryStatus(marketPackage(), [forked]).kind).toBe('forked');
    expect(libraryStatus(marketPackage(), []).kind).toBe('none');
  });

  it('finds a public fragment of the workspace by the id of its package', () => {
    expect(libraryStatus({ id: 'p-rust-ci' }, [linked, published]).kind).toBe('own');
  });

  it('badges the version of a linked fragment only when the publisher is ahead', () => {
    const pkg = marketPackage();

    expect(cardBadge(pkg, libraryStatus(pkg, [linked]))).toEqual({
      kind: 'in-library',
      version: 8,
    });
    expect(cardBadge(pkg, libraryStatus(pkg, [forked]))).toEqual({
      kind: 'in-library',
      version: null,
    });
    expect(cardBadge(pkg, { kind: 'none' })).toBeNull();
    expect(
      cardBadge(marketPackage({ createdAt: new Date().toISOString() }), { kind: 'none' }),
    ).toEqual({
      kind: 'new',
    });
  });
});

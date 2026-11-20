import { describe, expect, it } from 'vitest';
import {
  canPublishToMarketplace,
  publicName,
  withDeprecated,
  withNewVersion,
  withPublication,
} from '../fragment-publication.struct.ts';
import { PACKAGE } from './fragment-test-data.ts';

const author = { id: 'ines', name: 'Inès' };
const input = {
  version: 1,
  license: 'MIT',
  category: 'build',
  tags: ['docker'],
  autoPublish: false,
  author,
};
const NOW = '2026-11-20T10:00:00Z';

describe('fragment publication', () => {
  it('names a public fragment after the scope of the workspace', () => {
    expect(publicName('acme', 'docker-build')).toBe('@acme/docker-build');
  });

  it('lets the author or an admin publish, but never a linked fragment', () => {
    const own = { author, source: undefined };
    const linked = {
      author,
      source: {
        kind: 'linked' as const,
        package: PACKAGE,
        addedAt: NOW,
        upstream: [],
        skipped: [],
      },
    };

    expect(canPublishToMarketplace(own, { id: 'ines', admin: false })).toBe(true);
    expect(canPublishToMarketplace(own, { id: 'rem', admin: false })).toBe(false);
    expect(canPublishToMarketplace(own, { id: 'rem', admin: true })).toBe(true);
    expect(canPublishToMarketplace(linked, { id: 'ines', admin: true })).toBe(false);
  });

  it('keeps the first name and date when one more version goes public', () => {
    const first = withPublication(undefined, '@acme/docker-build', input, NOW);
    const next = withPublication(first, '@acme/renamed', { ...input, version: 2 }, 'later');

    expect(next).toEqual(
      expect.objectContaining({ name: '@acme/docker-build', versions: [1, 2], publishedAt: NOW }),
    );
  });

  it('makes a new version public on its own only with automatic publishing', () => {
    const manual = withPublication(undefined, '@acme/x', input, NOW);
    const automatic = withPublication(undefined, '@acme/x', { ...input, autoPublish: true }, NOW);

    expect(withNewVersion(manual, 2)?.versions).toEqual([1]);
    expect(withNewVersion(automatic, 2)?.versions).toEqual([1, 2]);
    expect(withNewVersion(undefined, 2)).toBeUndefined();
  });

  it('deprecates a version once', () => {
    const publication = withPublication(undefined, '@acme/x', input, NOW);

    expect(withDeprecated(withDeprecated(publication, 1), 1).deprecated).toEqual([1]);
  });
});

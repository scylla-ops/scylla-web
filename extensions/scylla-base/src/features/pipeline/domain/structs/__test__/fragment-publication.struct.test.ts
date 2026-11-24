import { describe, expect, it } from 'vitest';
import { canPublishToMarketplace, publicName } from '../fragment-publication.struct.ts';
import { PACKAGE } from './fragment-test-data.ts';

const author = { id: 'ines', name: 'Inès' };
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
});

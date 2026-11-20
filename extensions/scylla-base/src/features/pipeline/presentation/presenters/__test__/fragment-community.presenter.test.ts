import { describe, expect, it } from 'vitest';
import type {
  FragmentEntity,
  FragmentVersion,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import {
  sourceReference,
  versionChangeSign,
  versionRows,
} from '../fragment-community.presenter.ts';

const PACKAGE = { packageId: 'pnpm.node-ci', publisher: 'pnpm', name: 'node-ci', verified: true };

const version = (number: number): FragmentVersion => ({
  number,
  nodes: [],
  parameters: [],
  changes: [],
  author: { id: 'pnpm', name: 'pnpm' },
  publishedAt: '2026-10-01T10:00:00Z',
});

const fragment = (overrides: Partial<FragmentEntity>): FragmentEntity => ({
  id: 'f1',
  workspaceId: 'acme',
  name: 'node-ci',
  description: '',
  tags: [],
  author: { id: 'rem', name: 'Rem' },
  versions: [version(1)],
  favorite: false,
  usages: [],
  ...overrides,
});

const rowsOf = (entity: FragmentEntity) =>
  versionRows(entity).map(({ number, state, visibility }) => ({ number, state, visibility }));

describe('fragment community presenter', () => {
  it('names a fragment of the marketplace by its publisher', () => {
    expect(sourceReference(fragment({}))).toBe('');
    expect(
      sourceReference(
        fragment({
          source: { kind: 'forked', package: PACKAGE, addedAt: '', baseVersion: 4, upstream: null },
        }),
      ),
    ).toBe('@pnpm/node-ci');
  });

  it('signs a change by what it does', () => {
    expect(versionChangeSign({ kind: 'node-added', id: 'audit' })).toBe('+');
    expect(versionChangeSign({ kind: 'parameter-removed', key: 'CACHE' })).toBe('-');
    expect(versionChangeSign({ kind: 'default-changed', key: 'NODE', from: '20', to: '22' })).toBe(
      '~',
    );
  });

  it('puts the versions of the publisher among those of a linked fragment, the newest first', () => {
    const linked = fragment({
      versions: [version(8)],
      source: {
        kind: 'linked',
        package: PACKAGE,
        addedAt: '',
        upstream: [version(7), version(9)],
        skipped: [7],
      },
    });

    expect(rowsOf(linked)).toEqual([
      { number: 9, state: 'pending', visibility: null },
      { number: 8, state: 'library', visibility: null },
      { number: 7, state: 'skipped', visibility: null },
    ]);
  });

  it('closes the versions of a public fork with its base, each with its visibility', () => {
    const fork = fragment({
      versions: [version(1), version(2), version(3)],
      source: { kind: 'forked', package: PACKAGE, addedAt: '', baseVersion: 4, upstream: null },
      publication: {
        name: '@acme/node-ci',
        license: 'MIT',
        category: 'build',
        versions: [1, 2],
        autoPublish: false,
        deprecated: [1],
        publishedAt: '',
        publishedBy: { id: 'rem', name: 'Rem' },
        stats: { installs: 0, organizations: 0, stars: 0, forks: 0, adoption: [] },
      },
    });

    expect(rowsOf(fork)).toEqual([
      { number: 3, state: 'library', visibility: 'private' },
      { number: 2, state: 'library', visibility: 'public' },
      { number: 1, state: 'library', visibility: 'deprecated' },
      { number: 4, state: 'base', visibility: null },
    ]);
  });
});

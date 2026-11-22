import { describe, expect, it } from 'vitest';
import {
  facetCounts,
  filterPackages,
  isFiltered,
  NO_FILTER,
  toggled,
} from '../package-filter.presenter.ts';
import { marketPackage } from './package-test-data.ts';

const NODE = marketPackage();
const HELM = marketPackage({
  id: 'kube-tools.helm-deploy',
  name: 'helm-deploy',
  description: 'Helm upgrade.',
  publisher: { handle: 'kube-tools', verified: false, official: false },
  category: 'deploy',
  stacks: ['docker'],
  stars: 5,
});
const BUILDX = marketPackage({
  id: 'scylla.docker-buildx',
  name: 'docker-buildx',
  description: 'Multi-arch images.',
  publisher: { handle: 'scylla', verified: true, official: true },
  category: 'build',
  stacks: ['docker'],
  stars: 80,
});
const ALL = [NODE, HELM, BUILDX];

const names = (filter: Partial<typeof NO_FILTER>) =>
  filterPackages(ALL, { ...NO_FILTER, ...filter }).map(pkg => pkg.name);

describe('package filter', () => {
  it('sorts by the stars or by the name', () => {
    expect(names({ order: 'most-starred' })).toEqual(['docker-buildx', 'node-ci', 'helm-deploy']);
    expect(names({ order: 'name' })).toEqual(['docker-buildx', 'helm-deploy', 'node-ci']);
  });

  it('searches the name, the publisher and the steps', () => {
    expect(names({ query: 'kube' })).toEqual(['helm-deploy']);
    expect(names({ query: 'install' })).toHaveLength(3);
  });

  it('keeps the verified or official publishers', () => {
    expect(names({ verifiedOnly: true })).toEqual(['node-ci', 'docker-buildx']);
    expect(names({ officialOnly: true })).toEqual(['docker-buildx']);
  });

  it('adds up the checked categories, and the checked stacks', () => {
    expect(names({ categories: ['ci', 'build'] })).toEqual(['node-ci', 'docker-buildx']);
    expect(names({ stacks: ['docker'], categories: ['deploy'] })).toEqual(['helm-deploy']);
  });

  it('counts what each checkbox keeps within the search', () => {
    const counts = facetCounts(ALL, { ...NO_FILTER, verifiedOnly: true, categories: ['ci'] });

    expect(counts).toEqual({
      official: 1,
      categories: { ci: 1, build: 1 },
      stacks: { node: 1, docker: 1 },
    });
  });

  it('tells a filtered list, whatever its order', () => {
    expect(isFiltered({ ...NO_FILTER, order: 'name' })).toBe(false);
    expect(isFiltered({ ...NO_FILTER, stacks: ['go'] })).toBe(true);
    expect(toggled(toggled(['ci'], 'build'), 'ci')).toEqual(['build']);
  });
});

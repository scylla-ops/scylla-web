import type { FragmentEntity } from '@base/features/pipeline';
import type {
  MarketPackage,
  PackageVersion,
} from '@base/features/marketplace/domain/entities/market-package.entity.ts';

export const packageVersion = (number: number, days = 10): PackageVersion => ({
  number,
  nodes: [{ id: 'install', deps: [], kind: 'exec', command: 'pnpm', args: ['install'], env: [] }],
  parameters: [{ key: 'NPM_TOKEN', kind: 'secret', description: 'Registry token' }],
  changes: [`Release ${number}.`],
  author: { id: 'pnpm', name: '@pnpm' },
  publishedAt: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
});

export const marketPackage = (overrides: Partial<MarketPackage> = {}): MarketPackage => ({
  id: 'pnpm.node-ci',
  name: 'node-ci',
  description: 'pnpm install, lint and tests.',
  publisher: { handle: 'pnpm', verified: true, official: false },
  category: 'ci',
  stacks: ['node'],
  tags: ['node'],
  versions: [packageVersion(8, 80), packageVersion(9, 1)],
  deprecated: [],
  requirements: [],
  readme: 'Installs and tests.',
  stars: 10,
  starred: false,
  createdAt: '2025-01-01T10:00:00Z',
  ...overrides,
});

export const libraryFragment = (overrides: Partial<FragmentEntity> = {}): FragmentEntity => ({
  id: 'f1',
  workspaceId: 'ws-1',
  name: 'node-ci',
  description: 'pnpm install, lint and tests.',
  tags: ['node'],
  author: { id: 'rem', name: 'Rem' },
  versions: [packageVersion(8)],
  favorite: false,
  usages: [],
  ...overrides,
});

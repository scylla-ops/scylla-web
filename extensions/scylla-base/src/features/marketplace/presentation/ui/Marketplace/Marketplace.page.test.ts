import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { contextStore } from '@platform/context';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { FragmentEntity } from '@base/features/pipeline';
import type { MarketPackage } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
import {
  libraryFragment,
  marketPackage,
} from '@base/features/marketplace/presentation/presenters/__test__/package-test-data.ts';
import MarketplacePage from './Marketplace.page.svelte';

const PACKAGES = [
  marketPackage(),
  marketPackage({
    id: 'kube-tools.helm-deploy',
    name: 'helm-deploy',
    publisher: { handle: 'kube-tools', verified: false, official: false },
    category: 'deploy',
    stacks: ['docker'],
  }),
];

const LINKED = libraryFragment({
  source: {
    kind: 'linked',
    package: { packageId: 'pnpm.node-ci', publisher: 'pnpm', name: 'node-ci', verified: true },
    addedAt: '',
    upstream: [],
    skipped: [],
  },
});

let teardown: Array<() => void> = [];

const renderPage = (packages: MarketPackage[], fragments: FragmentEntity[] = []) => {
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      marketplace: { marketplaceRepository: { list: () => Promise.resolve(packages) } },
      pipeline: { fragmentRepository: { list: () => Promise.resolve(fragments) } },
    }),
  ];
  return render(MarketplacePage);
};

const cardNames = () => screen.queryAllByRole('link').map(link => link.textContent?.trim());

beforeEach(() => contextStore.setState({ workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' } }));

afterEach(() => teardown.forEach(restore => restore()));

describe('MarketplacePage', () => {
  it('lists the packages, the most recent first, and tells those in the library', async () => {
    renderPage(PACKAGES, [LINKED]);

    expect(await screen.findByRole('link', { name: 'helm-deploy' })).toBeInTheDocument();
    expect(cardNames()).toEqual(['node-ci', 'helm-deploy']);
    expect(screen.getByText('In library · v8')).toBeInTheDocument();
  });

  it('narrows the packages with the sidebar, then clears the filters', async () => {
    renderPage(PACKAGES);
    await screen.findByRole('link', { name: 'helm-deploy' });

    await userEvent.click(screen.getByRole('checkbox', { name: /Deploy/ }));
    expect(cardNames()).toEqual(['helm-deploy']);
    expect(screen.getByRole('heading', { name: '1 fragment' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(cardNames()).toEqual(['node-ci', 'helm-deploy']);
  });

  it('keeps the packages of the library in their tab', async () => {
    renderPage(PACKAGES, [LINKED]);
    await screen.findByRole('link', { name: 'helm-deploy' });

    await userEvent.click(screen.getByRole('tab', { name: 'Added to Acme · 1' }));

    expect(cardNames()).toEqual(['node-ci']);
    const tabs = screen.getByRole('tablist');
    expect(within(tabs).getByRole('tab', { name: 'Published by Acme · 0' })).toBeInTheDocument();
  });
});

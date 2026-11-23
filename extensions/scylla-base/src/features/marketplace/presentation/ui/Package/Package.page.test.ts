import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { FragmentEntity } from '@base/features/pipeline';
import {
  libraryFragment,
  marketPackage,
} from '@base/features/marketplace/presentation/presenters/__test__/package-test-data.ts';
import PackagePage from './Package.page.svelte';

const grant = (permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        { scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'restricted', permissions } },
      ],
    },
  });

let teardown: Array<() => void> = [];

const renderPage = (fragments: FragmentEntity[] = []) => {
  const cache = withQueryClient();
  const fragmentRepository = {
    list: vi.fn().mockResolvedValue(fragments),
    addFromMarketplace: vi.fn().mockResolvedValue(libraryFragment({ id: 'added' })),
  };
  const marketplaceRepository = {
    getById: vi.fn().mockResolvedValue(marketPackage()),
    setStar: vi.fn().mockResolvedValue(marketPackage({ starred: true, stars: 11 })),
  };
  teardown = [
    cache.restore,
    withRegistry({
      marketplace: { marketplaceRepository },
      pipeline: { fragmentRepository },
      user: {
        userRepository: {
          getMe: () => Promise.resolve({ id: 'rem', username: 'rem', displayName: 'Rem' }),
        },
      },
    }),
  ];
  render(PackagePage, { packageId: 'pnpm.node-ci' });
  return { fragmentRepository, marketplaceRepository };
};

beforeEach(() => {
  contextStore.setState({ workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' } });
  grant([Permission.UPDATE_PIPELINE]);
});

afterEach(() => teardown.forEach(restore => restore()));

describe('PackagePage', () => {
  it('tells what the package needs before it is added', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'node-ci' })).toBeInTheDocument();
    expect(screen.getByText('Not in the Acme library yet')).toBeInTheDocument();
    const before = screen.getByRole('heading', { name: 'Before you add it' }).parentElement!;
    expect(within(before).getByText('NPM_TOKEN')).toBeInTheDocument();
  });

  it('adds the latest version linked, then opens it in the library', async () => {
    const { fragmentRepository } = renderPage();
    const navigator = installTestNavigator({ pathname: '/acme/marketplace/pnpm.node-ci' });
    teardown.push(navigator.restore);

    await userEvent.click(await screen.findByRole('button', { name: 'Add to library' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Needs 1 secret: NPM_TOKEN')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add v9 to library' }));

    expect(fragmentRepository.addFromMarketplace).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        mode: 'linked',
        name: 'node-ci',
        version: expect.objectContaining({ number: 9 }),
        newer: [],
        author: { id: 'rem', name: 'Rem' },
      }),
    );
    await vi.waitFor(() => expect(navigator.navigate).toHaveBeenCalled());
    expect(navigator.navigate.mock.calls[0][0]).toMatch(/library\/added$/);
  });

  it('refuses a name that the library already holds', async () => {
    renderPage([libraryFragment({ name: 'node-ci' })]);

    await userEvent.click(await screen.findByRole('button', { name: 'Fork' }));
    const dialog = await screen.findByRole('dialog');

    expect(
      within(dialog).getByText('The library already has a fragment named node-ci.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Add v9 to library' })).toBeDisabled();
  });

  it('opens the fragment of the library once the package is in it', async () => {
    renderPage([
      libraryFragment({
        source: {
          kind: 'linked',
          package: {
            packageId: 'pnpm.node-ci',
            publisher: 'pnpm',
            name: 'node-ci',
            verified: true,
          },
          addedAt: '',
          upstream: [],
          skipped: [],
        },
      }),
    ]);

    expect(await screen.findByText('In the Acme library · linked v8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open in library' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add to library' })).not.toBeInTheDocument();
  });

  it('stars the package for the reader', async () => {
    const { marketplaceRepository } = renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Star · 10' }));

    expect(marketplaceRepository.setStar).toHaveBeenCalledWith('pnpm.node-ci', true);
    expect(await screen.findByRole('button', { name: 'Starred · 11' })).toBeInTheDocument();
  });
});

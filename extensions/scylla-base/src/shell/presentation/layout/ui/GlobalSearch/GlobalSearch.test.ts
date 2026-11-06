import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { setAppNavigator, setInstalledExtensions, setNavLinks } from '@scylla/core-sdk';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import InSidebar from '@base/shell/presentation/layout/ui/__test__/InSidebar.fixture.svelte';
import GlobalSearch from './GlobalSearch.svelte';

let teardown: (() => void)[] = [];

const setUp = () => render(InSidebar, { component: GlobalSearch });

beforeEach(() => {
  setAppNavigator({
    navigate: vi.fn(),
    back: vi.fn(),
    pathname: () => '/acme',
    search: () => '',
    params: () => ({ workspaceSlug: 'acme' }),
    trail: () => [],
  });
  setNavLinks(() => []);
  setInstalledExtensions([]);
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'restricted', permissions: [] } }],
    },
  });
  contextStore.setState({ workspace: { id: 'w1', name: 'Acme', slug: 'acme' } });
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ workspace: { workspaceRepository: { getMine: () => Promise.resolve([]) } } }),
  ];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  setAppNavigator(null);
  permissionsStore.setState({ permissions: null });
  contextStore.getState().reset();
});

describe('GlobalSearch', () => {
  it('does not load the bar before the first use', () => {
    setUp();

    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('opens the bar with the button', async () => {
    setUp();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('combobox')).toBeInTheDocument();
  });

  it('opens and closes the bar with the shortcut', async () => {
    setUp();

    await fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(await screen.findByRole('combobox')).toBeInTheDocument();

    await fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());
  });
});

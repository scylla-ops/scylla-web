import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import type {
  RoleEntity,
  RoleHolderEntry,
} from '@base/features/roles/domain/entities/role.entity.ts';
import HolderStack from './HolderStack.svelte';

const role: RoleEntity = {
  key: 'workspace-member',
  name: 'Workspace member',
  description: '',
  level: 'workspace',
  holder: 'people',
  grantName: 'workspace-member',
  builtin: true,
  fullControl: false,
  permissions: [],
  holderCount: 9,
};

const grant = (actorId: string, displayName: string, over: Partial<RoleHolderEntry> = {}) => ({
  actorId,
  actorKind: 'user',
  displayName,
  handle: '',
  runner: false,
  scopeKind: 'workspace' as const,
  scopeId: 'w-1',
  scopeName: 'Acme',
  ...over,
});

const holders = [
  grant('u-1', 'Marie Dupont'),
  grant('a-1', 'build-agent-01', {
    actorKind: 'app',
    runner: true,
    scopeKind: 'project',
    scopeId: 'p-1',
    scopeName: 'api-gateway',
  }),
  ...['Julie Petit', 'Karim Benali', 'Léo Moreau', 'Nina Bauer', 'Hugo Faure'].map((name, index) =>
    grant(`u-${index + 2}`, name),
  ),
];

let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;

beforeEach(() => {
  cache = withQueryClient();
  restoreRegistry = withRegistry({
    roles: { roleRepository: { holders: vi.fn().mockResolvedValue({ holders, total: 9 }) } },
  });
  contextStore.getState().setWorkspace('w-1', 'Acme', 'acme');
  permissionsStore.setState({
    permissions: {
      scopes: [
        { scope: PermissionScope.WORKSPACE, scopeId: 'w-1', access: { kind: 'fullControl' } },
      ],
    },
  });
});

afterEach(() => {
  restoreRegistry();
  cache.restore();
  contextStore.getState().reset();
  permissionsStore.setState({ permissions: null });
});

describe('HolderStack', () => {
  it('opens a card of the holders on hover, each holder a link to its member page', async () => {
    render(HolderStack, { role, workspaceId: 'w-1', canSeeHolders: true });

    await userEvent.hover(await screen.findByRole('button', { name: /^\+6\s*9 holders$/ }));

    expect(await findFloating('paragraph')).toHaveTextContent('6 people · 1 agent');
    const links = await screen.findAllByRole('link', { hidden: true });
    const agent = links.find(link => link.textContent?.includes('build-agent-01'));
    expect(agent).toHaveTextContent(/Agent\s*api-gateway/);
    expect(agent).toHaveAttribute('href', '/acme/access/members/a-1');
    expect(links).toHaveLength(7);
    expect(await findFloating('link', 'See all members')).toHaveAttribute(
      'href',
      '/acme/access/members',
    );
    expect(screen.getByText('+3 more')).toBeInTheDocument();
  });

  it('shows the count only, with no card, to a reader who cannot see the holders', async () => {
    render(HolderStack, { role, workspaceId: 'w-1', canSeeHolders: false });

    await waitFor(() => expect(screen.getByText('9 holders')).toBeInTheDocument());
    expect(screen.queryByRole('button')).toBeNull();
  });
});

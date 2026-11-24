import { fireEvent, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { getQueryClient } from '@scylla/core-sdk';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import RoleDetail from './RoleDetail.svelte';

const role = {
  key: 'r-1',
  name: 'Release',
  description: '',
  level: 'workspace',
  holder: 'people',
  grantName: 'r-1',
  builtin: false,
  fullControl: false,
  permissions: [],
  holderCount: 0,
};

let get: ReturnType<typeof vi.fn>;
let holders: ReturnType<typeof vi.fn>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  get = vi.fn().mockResolvedValue(role);
  holders = vi.fn().mockResolvedValue({ holders: [], total: 0 });
  cache = withQueryClient();
  navigator = installTestNavigator({ params: { roleKey: 'r-1' } });
  restoreRegistry = withRegistry({
    roles: {
      roleRepository: {
        get,
        holders,
        catalog: vi.fn().mockResolvedValue([]),
        list: vi.fn().mockResolvedValue([]),
      },
    },
    access: { accessRepository: { heldPermissions: vi.fn().mockResolvedValue(new Set()) } },
  });
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
});

afterEach(() => {
  restoreRegistry();
  cache.restore();
  navigator.restore();
});

describe('RoleDetail', () => {
  it('shows an error when the role cannot be read', async () => {
    get.mockRejectedValue(new ScyllaError('gone'));
    render(RoleDetail, {});

    expect(await screen.findByText('Error')).toBeInTheDocument();
  });

  it('keeps the draft of the editor when a refetch fails', async () => {
    render(RoleDetail, {});
    const name = await screen.findByDisplayValue('Release');
    await fireEvent.input(name, { target: { value: 'Unsaved draft' } });

    get.mockRejectedValue(new ScyllaError('down'));
    await getQueryClient().refetchQueries({ type: 'active' });
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.getByDisplayValue('Unsaved draft')).toBeInTheDocument();
  });

  it('tells if each holder of a built-in role is a person, an agent or another app', async () => {
    get.mockResolvedValue({ ...role, name: 'Runner pool', builtin: true, holder: 'apps' });
    const holder = (actorId: string, displayName: string, actorKind: string, runner: boolean) => ({
      actorId,
      actorKind,
      displayName,
      handle: '',
      runner,
      scopeKind: 'workspace',
      scopeId: 'w-1',
      scopeName: 'Acme',
    });
    holders.mockResolvedValue({
      holders: [
        holder('a-1', 'build-agent-01', 'app', true),
        holder('a-2', 'github-ci', 'app', false),
        holder('u-1', 'Ada Lovelace', 'user', false),
      ],
      total: 3,
    });
    render(RoleDetail, {});

    const row = async (name: string) => (await screen.findByText(name)).closest('li') as HTMLElement;
    expect(within(await row('build-agent-01')).getByText('Agent')).toBeInTheDocument();
    expect(within(await row('github-ci')).getByText('App')).toBeInTheDocument();
    const person = await row('Ada Lovelace');
    expect(within(person).queryByText('Agent')).not.toBeInTheDocument();
    expect(within(person).getByText('AL')).toBeInTheDocument();
  });
});

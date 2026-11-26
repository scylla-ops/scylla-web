import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import { contextStore } from '@platform/context';
import type { MemberRoleEntity } from '@base/features/access';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import MemberRolesCard from './MemberRolesCard.svelte';

const role = (overrides: Partial<MemberRoleEntity>): MemberRoleEntity => ({
  scopeKind: 'workspace',
  scopeId: 'w',
  scopeName: 'Acme',
  role: 'viewer',
  roleKey: 'custom-viewer',
  roleName: 'Viewer',
  ...overrides,
});

const creator = role({ role: 'creator', roleKey: 'custom-creator', roleName: 'Creator' });
const apiEditor = role({
  scopeKind: 'project',
  scopeId: 'p-1',
  scopeName: 'api',
  role: 'editor',
  roleKey: 'custom-editor',
  roleName: 'Editor',
});

let teardown: Array<() => void> = [];
afterEach(() => teardown.forEach(restore => restore()));

describe('MemberRolesCard', () => {
  it('shows the icon of the workspace and of each project in the headers', async () => {
    const cache = withQueryClient();
    teardown = [
      cache.restore,
      withRegistry({
        workspace: {
          workspaceRepository: {
            getMine: vi
              .fn()
              .mockResolvedValue([
                {
                  id: 'w',
                  name: 'Acme',
                  icon: { kind: 'glyph', name: 'rocket', color: 'chart-3' },
                },
              ]),
          },
        },
        project: {
          projectRepository: {
            getByWorkspaceId: vi.fn().mockResolvedValue({
              items: [
                { id: 'p-1', name: 'api', icon: { kind: 'glyph', name: 'cpu', color: 'chart-1' } },
              ],
              total: 1,
            }),
          },
        },
      }),
    ];
    contextStore.getState().setWorkspace('w', 'Acme', 'acme');
    teardown.push(() => contextStore.getState().setWorkspace(null, null));

    render(MemberRolesCard, {
      roles: [role({}), apiEditor],
      workspaceId: 'w',
      workspaceName: 'Acme',
    });

    const workspace = screen.getByRole('region', { name: 'Acme' });
    const api = within(workspace).getByRole('region', { name: 'api' });
    await waitFor(() => {
      const tiles = workspace.querySelectorAll(
        '[data-part="scope-tile"] [data-slot="entity-icon"]',
      );
      expect(tiles).toHaveLength(2);
    });
    expect(api.querySelector('[data-part="scope-tile"] [data-slot="entity-icon"]')).toHaveClass(
      'size-6',
    );
    expect(
      workspace.querySelector('[data-part="scope-tile"] [data-slot="entity-icon"]'),
    ).toHaveClass('size-8');
  });

  it('shows the workspace as a scope with its kind, not as one more role', () => {
    render(MemberRolesCard, { roles: [role({}), creator], workspaceName: 'Acme' });

    const workspace = screen.getByRole('region', { name: 'Acme' });
    expect(within(workspace).getByRole('heading', { name: 'Acme' })).toBeInTheDocument();
    expect(within(workspace).getByText('Workspace')).toBeInTheDocument();
    expect(
      within(workspace)
        .getAllByRole('listitem')
        .map(item => item.textContent),
    ).toEqual([expect.stringContaining('Viewer'), expect.stringContaining('Creator')]);
  });

  it('puts each project inside the workspace, with its own roles', () => {
    render(MemberRolesCard, { roles: [role({}), apiEditor], workspaceName: 'Acme' });

    const workspace = screen.getByRole('region', { name: 'Acme' });
    const api = within(workspace).getByRole('region', { name: 'api' });
    expect(within(api).getByText('Project')).toBeInTheDocument();
    expect(within(api).getByText('Editor')).toBeInTheDocument();
    expect(within(api).queryByText('Viewer')).not.toBeInTheDocument();
  });

  it('keeps the workspace with no role above a project role', () => {
    render(MemberRolesCard, { roles: [apiEditor], workspaceName: 'Acme' });

    const workspace = screen.getByRole('region', { name: 'Acme' });
    expect(within(workspace).getByText('No role')).toBeInTheDocument();
    expect(within(workspace).getByRole('region', { name: 'api' })).toHaveTextContent('Editor');
  });
});

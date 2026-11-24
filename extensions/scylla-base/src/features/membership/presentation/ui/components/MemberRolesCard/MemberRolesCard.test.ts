import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import type { MemberRoleEntity } from '@base/features/access';
import { render } from '@test/render.ts';
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

describe('MemberRolesCard', () => {
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

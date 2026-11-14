import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { render } from '@test/render.ts';
import NewProjectPage from './NewProject.page.svelte';

const open = (permissions: Permission[]) => {
  contextStore.setState({ workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' } });
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });
  render(NewProjectPage);
};

afterEach(() => permissionsStore.setState({ permissions: null }));

describe('NewProjectPage', () => {
  it('offers a regular project and a project linked to GitHub, each on its own page', () => {
    open([Permission.CREATE_PROJECT, Permission.MANAGE_REPOSITORY_LINK]);

    expect(screen.getByRole('heading', { level: 1, name: 'New project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a regular project' })).toHaveAttribute(
      'href',
      '/acme/projects/new/regular',
    );
    expect(screen.getByRole('link', { name: 'Link a GitHub repository' })).toHaveAttribute(
      'href',
      '/acme/projects/new/github',
    );
  });

  it('keeps the GitHub way inert, with the reason, for a person who cannot link a repository', () => {
    open([Permission.CREATE_PROJECT]);

    expect(screen.queryByRole('link', { name: 'Link a GitHub repository' })).toBeNull();
    const card = screen.getByRole('group', { name: 'Link a GitHub repository' });
    expect(card).toHaveAttribute('aria-disabled', 'true');
    expect(card).toHaveAccessibleDescription(/You cannot link a repository in this workspace\./);
    expect(screen.getByRole('link', { name: 'Start a regular project' })).toBeInTheDocument();
  });
});

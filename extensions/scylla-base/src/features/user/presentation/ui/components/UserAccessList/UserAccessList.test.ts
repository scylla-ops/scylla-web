import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.svelte.ts';
import UserAccessList from './UserAccessList.svelte';

describe('UserAccessList', () => {
  it('says so when the user holds no role', () => {
    render(UserAccessList, { access: [] });

    expect(screen.getByText('No role yet.')).toBeInTheDocument();
  });

  it('shows an error when the roles cannot be read', () => {
    render(UserAccessList, { access: undefined, isError: true });

    expect(screen.getByText('Error loading the organizations and roles')).toBeInTheDocument();
  });

  it('shows no empty message while the roles load', () => {
    render(UserAccessList, { access: undefined, isLoading: true });

    expect(screen.queryByText('No role yet.')).not.toBeInTheDocument();
  });

  it('links each organization to its dashboard and badges the scope of each role', () => {
    render(UserAccessList, {
      access: [
        {
          grantId: 'g-1',
          scope: 'organization',
          organizationId: 'org-1',
          organizationName: 'Beta Lab',
          projectName: '',
          roleId: 'organization-member',
          roleName: 'Member',
        },
        {
          grantId: 'g-2',
          scope: 'project',
          organizationId: 'org-1',
          organizationName: 'Beta Lab',
          projectId: 'project-1',
          projectName: 'API',
          roleId: 'project-admin',
          roleName: 'Project admin',
        },
      ],
    });

    expect(screen.getByRole('link', { name: 'Beta Lab' })).toHaveAttribute(
      'href',
      '/beta-lab/dashboard',
    );
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Project API')).toBeInTheDocument();
    expect(screen.queryByText('System')).not.toBeInTheDocument();
  });
});

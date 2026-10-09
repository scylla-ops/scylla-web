import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render } from '@test/render.svelte.ts';
import AddRoleSelect from './AddRoleSelect.svelte';

const role = (roleId: string, name: string, ownedByOrganization = false) => ({
  roleId,
  name,
  description: '',
  ownedByOrganization,
});

const roles = [role('project-viewer', 'Project viewer'), role('project-admin', 'Project admin')];

describe('AddRoleSelect', () => {
  it('renders nothing once there is no role left to add', () => {
    render(AddRoleSelect, { roles: [], organizationName: 'Acme', disabled: false, onSelect: vi.fn() });

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('offers every addable role', async () => {
    render(AddRoleSelect, { roles, organizationName: 'Acme', disabled: false, onSelect: vi.fn() });

    await userEvent.click(screen.getByRole('combobox'));

    expect(await findFloating('option', 'Project viewer')).toBeInTheDocument();
    expect(await findFloating('option', 'Project admin')).toBeInTheDocument();
  });

  it('reports the role id that was chosen, not its label', async () => {
    const onSelect = vi.fn();
    render(AddRoleSelect, { roles, organizationName: 'Acme', disabled: false, onSelect });

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await findFloating('option', 'Project admin'));

    expect(onSelect).toHaveBeenCalledWith('project-admin');
  });

  it('is disabled while a write is in flight', () => {
    render(AddRoleSelect, { roles, organizationName: 'Acme', disabled: true, onSelect: vi.fn() });

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it("lists the organization's own roles under their header, before the platform roles", async () => {
    render(AddRoleSelect, {
      roles: [role('organization-viewer', 'Organization viewer'), role('auditor', 'Auditor', true)],
      organizationName: 'Acme',
      disabled: false,
      onSelect: vi.fn(),
    });

    await userEvent.click(screen.getByRole('combobox'));

    const [acme, platform] = await screen.findAllByRole('group', { hidden: true });
    expect(acme).toHaveTextContent(/^Acme roles\s*Auditor$/);
    expect(platform).toHaveTextContent(/^Platform roles\s*Organization viewer$/);
  });

  it('goes back to its placeholder after a pick, never showing a role id', async () => {
    render(AddRoleSelect, { roles, organizationName: 'Acme', disabled: false, onSelect: vi.fn() });

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await findFloating('option', 'Project admin'));

    expect(screen.getByRole('combobox')).toHaveTextContent('+ role');
  });
});


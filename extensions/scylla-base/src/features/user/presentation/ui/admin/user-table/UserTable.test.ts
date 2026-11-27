import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
import UserTable from './UserTable.svelte';

const user: UserEntity = {
  id: 'user-1',
  username: 'ada',
  displayName: 'Ada Lovelace',
  isActive: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
  workspaces: ['Acme', 'Beta'],
  workspaceDetails: [
    {
      id: 'ws-1',
      name: 'Acme',
      icon: { kind: 'glyph', name: 'rocket', color: 'chart-3' },
      owner: true,
    },
    { id: 'ws-2', name: 'Beta', owner: false, ownerName: 'Grace Hopper' },
  ],
};

const renderTable = (data: UserEntity[]) =>
  render(UserTable, {
    data,
    canChangeRoles: false,
    canDelete: () => false,
    onChangeRoles: vi.fn(),
    onDelete: vi.fn(),
    onView: vi.fn(),
  });

describe('UserTable', () => {
  it('shows each workspace with its icon, and the owner of the ones that the user does not own', () => {
    renderTable([user]);

    const rows = document.querySelectorAll('[data-part="user-workspace"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Acme');
    expect(rows[0]).toHaveTextContent('Owner');
    expect(rows[0]?.querySelector('[data-slot="workspace-icon"]')).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent('Beta');
    expect(rows[1]).toHaveTextContent('Owner: Grace Hopper');
    expect(rows[1]?.querySelector('[data-slot="workspace-icon"]')).toBeInTheDocument();
  });

  it('keeps the names of an older server, with no detail', () => {
    renderTable([{ ...user, workspaceDetails: [] }]);

    expect(screen.getByText('Acme, Beta')).toBeInTheDocument();
  });
});

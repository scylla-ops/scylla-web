import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { screen } from '@testing-library/svelte';
import { i18n } from '@lingui/core';
import { Permission, PermissionScope, RoleKind } from '@platform/authz';
import { messages } from '../../../../locales/fr/messages.ts';
import { render } from '@test/render.svelte.ts';
import type { RoleEntity } from '../../../../domain/entities/role.entity.ts';
import RoleListItem from './RoleListItem.svelte';

const role: RoleEntity = {
  id: 'auditor',
  name: 'Auditor',
  description: 'reads the organization',
  scope: PermissionScope.ORGANIZATION,
  origin: { kind: 'custom', ownerOrganizationId: 'org-1' },
  kind: RoleKind.MEMBER,
  access: { kind: 'restricted', permissions: [Permission.READ_ORGANIZATION] },
};

afterEach(() => i18n.activate('en'));

describe('RoleListItem', () => {
  it('renders the scope again when the locale changes', () => {
    i18n.load('fr', messages);
    render(RoleListItem, {
      role,
      memberCount: 1,
      active: false,
      selected: false,
      selectable: true,
      onOpen: vi.fn(),
      onToggleSelect: vi.fn(),
    });
    expect(screen.getByText('Organization')).toBeInTheDocument();

    i18n.activate('fr');
    flushSync();

    expect(screen.getByText('Organisation')).toBeInTheDocument();
  });
});

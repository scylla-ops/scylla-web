import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import { Permission, PermissionScope, RoleKind } from '@platform/authz';
import { messages } from '../../../../locales/fr/messages.ts';
import { render } from '@test/render.svelte.ts';
import { withLocale } from '@test/i18n.ts';
import type { RoleEntity } from '../../../../domain/entities/role.entity.ts';
import RoleListItem from './RoleListItem.svelte';

/** French puts 0 and 1 in the singular arm: "0 membre", "1 membre", "2 membres". */
withLocale('fr', messages);

const role: RoleEntity = {
  id: 'auditor',
  name: 'Auditor',
  description: 'reads the organization',
  scope: PermissionScope.ORGANIZATION,
  origin: { kind: 'custom', ownerOrganizationId: 'org-1' },
  kind: RoleKind.MEMBER,
  access: { kind: 'restricted', permissions: [Permission.READ_ORGANIZATION] },
};

const props = (memberCount: number | null) => ({
  role,
  memberCount,
  active: false,
  selected: false,
  selectable: true,
  onOpen: vi.fn(),
  onToggleSelect: vi.fn(),
});

describe('RoleListItem member count in French', () => {
  it.each([
    [0, '0 membre'],
    [1, '1 membre'],
    [2, '2 membres'],
  ])('counts %i holder(s) as "%s"', (count, text) => {
    render(RoleListItem, props(count));

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('shows no count when the grants are out of reach', () => {
    render(RoleListItem, props(null));

    expect(screen.queryByText(/membre/)).toBeNull();
  });
});

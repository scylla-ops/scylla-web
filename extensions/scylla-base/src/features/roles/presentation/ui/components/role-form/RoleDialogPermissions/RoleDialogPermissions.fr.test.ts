import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import { PermissionScope } from '@platform/authz';
import { messages } from '../../../../../locales/fr/messages.ts';
import { render } from '@test/render.svelte.ts';
import { withLocale } from '@test/i18n.ts';
import RoleDialogPermissions from './RoleDialogPermissions.svelte';

/** The counts agree in French, with no "(s)": the plural arms carry the agreement. */
withLocale('fr', messages);

const mount = (conferredCount: number, preservedCount = 0) =>
  render(RoleDialogPermissions, {
    scope: PermissionScope.ORGANIZATION,
    permissions: [],
    preservedCount,
    conferredCount,
    isPending: false,
    onPermissionsChange: vi.fn(),
  });

describe('RoleDialogPermissions counts in French', () => {
  it('agrees the conferred count with the number', () => {
    mount(1);
    expect(screen.getByText('1 sélectionnée')).toBeInTheDocument();
  });

  it('uses the plural arm above one', () => {
    mount(3);
    expect(screen.getByText('3 sélectionnées')).toBeInTheDocument();
  });

  it('agrees the note on the permissions it keeps', () => {
    mount(1, 1);
    expect(
      screen.getByText(
        'Ce rôle détient aussi 1 permission non gérée ici. Elle est conservée telle quelle.',
      ),
    ).toBeInTheDocument();
  });
});

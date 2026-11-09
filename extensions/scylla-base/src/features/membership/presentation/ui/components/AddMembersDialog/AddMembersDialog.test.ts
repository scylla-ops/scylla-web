import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import { toast } from 'svelte-sonner';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import AddMembersDialog from './AddMembersDialog.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const role = (grantName: string, name: string, permissions: string[], level = 'workspace') => ({
  key: grantName,
  name,
  description: '',
  level,
  holder: 'people',
  grantName,
  builtin: true,
  fullControl: false,
  permissions,
  holderCount: 0,
});

let grant: ReturnType<typeof vi.fn>;
let create: ReturnType<typeof vi.fn>;
let teardown: Array<() => void> = [];

const lina = { id: 'u-1', username: 'lina', displayName: 'Lina Moreau', email: 'lina@acme.dev' };
const omar = { id: 'u-2', username: 'omar', displayName: 'Omar Haddad' };

const open = (
  held: string[],
  directory: { canBrowse: boolean } | null = null,
  people: readonly (typeof lina | typeof omar)[] = [lina],
  more: ReturnType<typeof role>[] = [],
) => {
  grant = vi.fn().mockResolvedValue(undefined);
  create = vi.fn().mockResolvedValue({ id: 'i-1' });
  const cache = withQueryClient();
  const restore = withRegistry({
    access: {
      accessRepository: {
        grant,
        revoke: vi.fn(),
        check: vi.fn().mockResolvedValue(new Set()),
        heldPermissions: vi.fn().mockResolvedValue(new Set(held)),
      },
    },
    roles: {
      roleRepository: {
        catalog: vi.fn().mockResolvedValue([]),
        list: vi
          .fn()
          .mockResolvedValue([
            role('member', 'Workspace member', ['pipelines.edit']),
            role('viewer', 'Workspace viewer', ['pipelines.view']),
            ...more,
          ]),
      },
    },
    invitation: { invitationRepository: { create } },
    project: {
      projectRepository: {
        getByWorkspaceId: vi.fn().mockResolvedValue({
          items: [
            { id: 'p-1', name: 'api' },
            { id: 'p-2', name: 'web' },
          ],
        }),
      },
    },
  });
  teardown = [cache.restore, restore];
  render(AddMembersDialog, {
    open: true,
    onOpenChange: vi.fn(),
    workspaceId: 'w-1',
    workspaceName: 'acme',
    candidates: directory ? [] : people,
    canBrowse: directory?.canBrowse ?? true,
    onAdded: vi.fn(),
  });
};

/** The dialog takes the focus just after it opens: a key sent before that is lost. */
const ready = async () => {
  await screen.findByDisplayValue('Workspace member');
  await vi.waitFor(() =>
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement),
  );
};

/** What a screen reader reads in a row of the list: the avatar is hidden. */
const spokenText = (row: HTMLElement) => {
  const copy = row.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
  return copy.textContent.replace(/\s+/g, ' ').trim();
};

const findPerson = async (text: string) => {
  const matches = (await screen.findAllByRole('option', { hidden: true })).filter(
    row => spokenText(row) === text,
  );
  expect(matches).toHaveLength(1);
  return matches[0];
};

beforeEach(() => {
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('AddMembersDialog', () => {
  it('says that only an email adds someone to a caller who cannot browse', () => {
    open(['pipelines.edit'], { canBrowse: false });

    expect(screen.getByText(/You cannot browse the users/)).toBeInTheDocument();
  });

  it('does not say it to a caller who can browse, with no one left to add', () => {
    open(['pipelines.edit'], { canBrowse: true });

    expect(screen.queryByText(/You cannot browse the users/)).not.toBeInTheDocument();
  });

  it('gives the workspace role to a person of the directory', async () => {
    open(['pipelines.edit', 'pipelines.view']);
    await ready();

    await userEvent.type(screen.getByLabelText('People'), 'lina');
    await userEvent.click(await findPerson('Lina Moreau lina@acme.dev'));
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 member' }));

    await vi.waitFor(() =>
      expect(grant).toHaveBeenCalledWith({ kind: 'workspace', id: 'w-1' }, 'member', 'u-1'),
    );
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('1 member added'));
  });

  it('makes an invitation from an email', async () => {
    open(['pipelines.edit', 'pipelines.view']);
    await ready();

    await userEvent.type(screen.getByLabelText('People'), 'new@acme.dev{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 member' }));

    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(grant).not.toHaveBeenCalled();
  });

  it('does not put the role owner in an invitation', async () => {
    open(
      ['pipelines.edit', 'pipelines.view'],
      null,
      [lina],
      [role('owner', 'Workspace owner', [])],
    );
    await ready();

    await userEvent.type(screen.getByLabelText('People'), 'new@acme.dev{Enter}');
    await userEvent.click(screen.getByRole('combobox', { name: 'Workspace role' }));
    await userEvent.click(
      await findFloating(
        'option',
        'Workspace owner Full control of one workspace, also its deletion and its owners.',
      ),
    );

    expect(screen.getByText(/An invitation does not carry the role/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add 1 member' })).toBeDisabled();
  });

  it('gives the role owner to a person of the directory', async () => {
    open(
      ['pipelines.edit', 'pipelines.view'],
      null,
      [lina],
      [role('owner', 'Workspace owner', [])],
    );
    await ready();

    await userEvent.type(screen.getByLabelText('People'), 'lina');
    await userEvent.click(await findPerson('Lina Moreau lina@acme.dev'));
    await userEvent.click(screen.getByRole('combobox', { name: 'Workspace role' }));
    await userEvent.click(
      await findFloating(
        'option',
        'Workspace owner Full control of one workspace, also its deletion and its owners.',
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add 1 member' }));

    await vi.waitFor(() =>
      expect(grant).toHaveBeenCalledWith({ kind: 'workspace', id: 'w-1' }, 'owner', 'u-1'),
    );
  });

  it('starts on a role that the caller can give', async () => {
    open(['pipelines.view']);

    expect(await screen.findByDisplayValue('Workspace viewer')).toBeInTheDocument();
  });

  it('cannot send a role that no one here can give', async () => {
    open([]);
    await screen.findByText('Add members to acme');

    await userEvent.type(screen.getByLabelText('People'), 'lina');
    await userEvent.click(await findPerson('Lina Moreau lina@acme.dev'));

    expect(screen.getByRole('button', { name: 'Add 1 member' })).toBeDisabled();
  });

  describe('the people field', () => {
    const people = () => screen.getByRole<HTMLInputElement>('combobox', { name: 'People' });
    const rows = () =>
      screen.queryAllByRole('option', { hidden: true }).map(spokenText);

    it('shows the directory on a click, before any text', async () => {
      open(['pipelines.edit'], null, [lina, omar]);
      await ready();

      await userEvent.click(people());

      await findPerson('Lina Moreau lina@acme.dev');
      expect(rows()).toEqual(['Lina Moreau lina@acme.dev', 'Omar Haddad']);
    });

    it('finds a person by the handle and by the email, with no accent', async () => {
      open(['pipelines.edit'], null, [lina, { ...omar, displayName: 'Omár Haddad' }]);
      await ready();

      await userEvent.type(people(), 'acme');
      await findPerson('Lina Moreau lina@acme.dev');
      expect(rows()).toEqual(['Lina Moreau lina@acme.dev']);

      await userEvent.clear(people());
      await userEvent.type(people(), 'omar');
      await findPerson('Omár Haddad');
    });

    it('shows a person of the list and of a chip with the avatar of a person', async () => {
      open(['pipelines.edit']);
      await ready();

      await userEvent.click(people());
      const row = await findPerson('Lina Moreau lina@acme.dev');
      expect(row.querySelector('[data-kind]')).toHaveAttribute('data-kind', 'person');
      await userEvent.click(row);

      const remove = screen.getByRole('button', { name: 'Remove Lina Moreau' });
      expect(remove.parentElement?.querySelector('[data-kind]')).toHaveTextContent(/^L$/);
    });

    it('adds the highlighted person on Enter, and clears the text', async () => {
      open(['pipelines.edit']);
      await ready();

      await userEvent.type(people(), 'lin{Enter}');

      expect(screen.getByRole('button', { name: 'Add 1 member' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Remove Lina Moreau' })).toBeInTheDocument();
      expect(people().value).toBe('');
      await waitFor(() => expect(people()).toHaveAttribute('aria-expanded', 'false'));
    });

    it('does not offer a person who has a chip, and offers them again after the chip goes', async () => {
      open(['pipelines.edit'], null, [lina, omar]);
      await ready();

      await userEvent.type(people(), 'lin{Enter}');
      await userEvent.click(people());
      await findPerson('Omar Haddad');
      expect(rows()).toEqual(['Omar Haddad']);

      await userEvent.keyboard('{Escape}');
      await userEvent.click(screen.getByRole('button', { name: 'Remove Lina Moreau' }));
      await userEvent.type(people(), 'lin{Enter}');

      expect(screen.getByRole('button', { name: 'Add 1 member' })).toBeEnabled();
    });

    it('adds an email with a comma, also while a row matches', async () => {
      open(['pipelines.edit'], null, [{ ...lina, email: 'lina@acme.dev.fr' }]);
      await ready();

      await userEvent.type(people(), 'lina@acme.dev,');

      expect(screen.getByText('lina@acme.dev')).toBeInTheDocument();
      expect(people().value).toBe('');
    });

    it('keeps the list closed after a comma adds an email, until the next letter', async () => {
      open(['pipelines.edit']);
      await ready();

      await userEvent.type(people(), 'new@acme.dev,');

      expect(people()).toHaveAttribute('aria-expanded', 'false');

      await userEvent.keyboard('lin');

      await findPerson('Lina Moreau lina@acme.dev');
    });

    it('closes only the list on Escape, and then Enter takes the text', async () => {
      open(['pipelines.edit'], null, [{ ...lina, email: 'lina@acme.dev.fr' }]);
      await ready();

      await userEvent.type(people(), 'lina@acme.dev');
      await findPerson('Lina Moreau lina@acme.dev.fr');
      await userEvent.keyboard('{Escape}');

      await waitFor(() => expect(people()).toHaveAttribute('aria-expanded', 'false'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await userEvent.keyboard('{Enter}');

      expect(screen.getByText('lina@acme.dev')).toBeInTheDocument();
    });

    it('says how many people the list does not show', async () => {
      const many = Array.from({ length: 53 }, (_, index) => ({
        id: `u-${index}`,
        username: `user${index}`,
        displayName: `User ${index}`,
        email: `user${index}@acme.dev`,
      }));
      open(['pipelines.edit'], null, many);
      await ready();

      await userEvent.click(people());

      expect(
        await screen.findByText('3 more people. Type to narrow the list.'),
      ).toBeInTheDocument();
      expect(rows()).toHaveLength(50);
    });

    it('points the field at its list only while the list is open', async () => {
      open(['pipelines.edit']);
      await ready();
      expect(people()).not.toHaveAttribute('aria-controls');

      await userEvent.click(people());

      const list = await findFloating('listbox');
      expect(people()).toHaveAttribute('aria-controls', list.id);
    });
  });

  it('finds a project by its name for a project role', async () => {
    open(['pipelines.edit']);
    await ready();

    await userEvent.click(screen.getByRole('button', { name: '+ Add a project role' }));
    const project = screen.getByRole<HTMLInputElement>('combobox', { name: 'Project' });
    await userEvent.type(project, 'we');
    await findFloating('option', 'web');
    expect(screen.queryAllByRole('option', { hidden: true })).toHaveLength(1);
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(project.value).toBe('web'));
  });
});

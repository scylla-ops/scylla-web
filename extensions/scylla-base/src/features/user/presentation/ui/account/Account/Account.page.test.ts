import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as Login from '@base/features/login';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { toast } from 'svelte-sonner';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { UserAccess } from '../../../../domain/structs/user-access.struct.ts';
import AccountPage from './Account.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const signOut = vi.fn();
vi.mock('@base/features/login', async importOriginal => ({
  ...(await importOriginal<typeof Login>()),
  signOut: () => signOut(),
}));

const me = {
  userId: 'user-1',
  username: 'ada',
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const access: UserAccess[] = [
  {
    grantId: 'g-system',
    scope: 'system',
    organizationName: '',
    projectName: '',
    roleId: 'system-admin',
    roleName: 'System admin',
  },
  {
    grantId: 'g-org',
    scope: 'organization',
    organizationId: 'org-1',
    organizationName: 'Acme Corp',
    projectName: '',
    roleId: 'organization-admin',
    roleName: 'Organization admin',
  },
  {
    grantId: 'g-project',
    scope: 'project',
    organizationId: 'org-1',
    organizationName: 'Acme Corp',
    projectId: 'project-1',
    projectName: 'Web',
    roleId: 'project-viewer',
    roleName: 'Viewer',
  },
];

const refused = (message: string) =>
  ScyllaResult.error<void>(
    new ScyllaError('Failed.', {
      cause: Object.assign(new Error(message), { code: 'FAILED_PRECONDITION' }),
    }),
  );

let teardown: Array<() => void> = [];
let repository: Record<string, ReturnType<typeof vi.fn>>;

const setUp = (overrides: Record<string, ReturnType<typeof vi.fn>> = {}) => {
  repository = {
    getMe: vi.fn().mockResolvedValue(ScyllaResult.success(me)),
    listAccess: vi.fn().mockResolvedValue(ScyllaResult.success(access)),
    update: vi.fn().mockResolvedValue(ScyllaResult.success(me)),
    changePassword: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
    revokeSessions: vi.fn().mockResolvedValue(ScyllaResult.success(2)),
    deleteAccount: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
    ...overrides,
  };
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ user: { userRepository: repository } })];
  render(AccountPage);
};

const section = (name: string) => screen.getByRole('region', { name });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('userId', 'user-1');
});

afterEach(() => {
  teardown.forEach(restore => restore());
  localStorage.clear();
});

describe('AccountPage', () => {
  it('shows who is signed in, from the account of the session', async () => {
    setUp();

    expect(await screen.findByRole('heading', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0);
    expect(repository.getMe).toHaveBeenCalled();
  });

  it('shows an error when the account cannot be read', async () => {
    setUp({ getMe: vi.fn().mockResolvedValue(refused('down')) });

    expect(await screen.findByText('Error loading your account')).toBeInTheDocument();
  });

  describe('profile', () => {
    it('shows the email read-only, with the reason', async () => {
      setUp();

      const email = await screen.findByLabelText('Email');
      expect(email).toHaveAttribute('readonly');
      expect(email).toHaveAccessibleDescription('Only an administrator can change it.');
      expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(
        'A handle that other people see.',
      );
    });

    it('saves the changed fields only', async () => {
      setUp();
      const user = userEvent.setup();

      const displayName = await screen.findByLabelText('Display name');
      await user.clear(displayName);
      await user.type(displayName, 'Ada King');
      await user.click(within(section('Profile')).getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(repository.update).toHaveBeenCalledWith({
          userId: 'user-1',
          displayName: 'Ada King',
        }),
      );
    });

    it('calls nothing when nothing changed', async () => {
      setUp();
      const user = userEvent.setup();

      await screen.findByLabelText('Display name');
      await user.click(within(section('Profile')).getByRole('button', { name: 'Save' }));

      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('password', () => {
    const changeFrom = async (current: string, next = 'new-password', confirmation = next) => {
      const user = userEvent.setup();
      await user.type(await screen.findByLabelText('Current password'), current);
      await user.type(screen.getByLabelText('New password'), next);
      await user.type(screen.getByLabelText('Confirm password'), confirmation);
      await user.click(screen.getByRole('button', { name: 'Change the password' }));
    };

    it('changes it, says the other sessions are out, and empties the form', async () => {
      setUp();

      await changeFrom('old-password');

      await waitFor(() =>
        expect(repository.changePassword).toHaveBeenCalledWith('old-password', 'new-password'),
      );
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith(
          'Password changed. Your other sessions are signed out.',
        ),
      );
      await waitFor(() => expect(screen.getByLabelText('Current password')).toHaveValue(''));
    });

    it('shows the message of the server under the current password', async () => {
      setUp({
        changePassword: vi.fn().mockResolvedValue(refused('Current password is incorrect')),
      });

      await changeFrom('wrong-password');

      await waitFor(() =>
        expect(screen.getByLabelText('Current password')).toHaveAccessibleDescription(
          'Current password is incorrect',
        ),
      );
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('refuses a confirmation that differs, before any call', async () => {
      setUp();

      await changeFrom('old-password', 'new-password', 'other-password');

      expect(screen.getByText('The two passwords are not the same.')).toBeInTheDocument();
      expect(repository.changePassword).not.toHaveBeenCalled();
    });

    it('gives each field its autocomplete value', async () => {
      setUp();

      expect(await screen.findByLabelText('Current password')).toHaveAttribute(
        'autocomplete',
        'current-password',
      );
      expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password');
    });
  });

  it('signs out the other sessions and tells how many', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Sign out everywhere else' }));

    await waitFor(() => expect(repository.revokeSessions).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 sessions signed out.'));
  });

  it('lists the roles by organization, the system grants apart', async () => {
    setUp();

    const roles = await screen.findByRole('region', { name: 'Organizations and roles' });
    await within(roles).findByText('System admin');
    expect(within(roles).getByText('System')).toBeInTheDocument();
    expect(within(roles).getByRole('link', { name: 'Acme Corp' })).toHaveAttribute(
      'href',
      '/acme-corp/dashboard',
    );
    expect(within(roles).getByText('Organization admin')).toBeInTheDocument();
    expect(within(roles).getByText('Project Web')).toBeInTheDocument();
    expect(repository.listAccess).toHaveBeenCalledWith('user-1');
  });

  describe('deletion', () => {
    const confirmWith = async (password: string) => {
      const user = userEvent.setup();
      await user.click(await screen.findByRole('button', { name: 'Delete my account' }));
      const dialog = await screen.findByRole('dialog');
      await focusSettled();
      await user.type(within(dialog).getByLabelText('Password'), password);
      await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }));
      return dialog;
    };

    it('asks for the password, deletes the account and signs out', async () => {
      setUp();

      await confirmWith('my-password');

      await waitFor(() => expect(repository.deleteAccount).toHaveBeenCalledWith('my-password'));
      await waitFor(() => expect(signOut).toHaveBeenCalled());
    });

    it('shows the refusal of the server in the dialog, and stays signed in', async () => {
      setUp({
        deleteAccount: vi
          .fn()
          .mockResolvedValue(refused('Appoint another admin of Acme Corp first')),
      });

      const dialog = await confirmWith('my-password');

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Appoint another admin of Acme Corp first',
      );
      expect(signOut).not.toHaveBeenCalled();
    });
  });
});

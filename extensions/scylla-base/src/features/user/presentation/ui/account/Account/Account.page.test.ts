import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as Login from '@base/features/login';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { toast } from 'svelte-sonner';
import { installTestNavigator } from '@test/navigator.ts';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { UserAccess } from '@base/features/user/domain/entities/user.entity.ts';
import type { UserSessionEntity } from '@base/features/user/domain/entities/user-session.entity.ts';
import AccountPage from './Account.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const signOut = vi.fn();
vi.mock('@base/features/login', async importOriginal => ({
  ...(await importOriginal<typeof Login>()),
  signOut: () => signOut(),
}));

const me = {
  id: 'user-1',
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
    roleId: 'system-admin',
    roleName: 'System admin',
  },
  {
    grantId: 'g-org',
    scope: 'organization',
    organizationId: 'org-1',
    organizationName: 'Acme Corp',
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

const recently = () => new Date(Date.now() - 60_000).toISOString();

const sessions: UserSessionEntity[] = [
  {
    id: 'session-1',
    createdAt: recently(),
    lastActiveAt: recently(),
    expiresAt: '',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    ipAddress: '203.0.113.7',
    current: true,
  },
  {
    id: 'session-2',
    createdAt: recently(),
    lastActiveAt: recently(),
    expiresAt: '',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
    ipAddress: '198.51.100.4',
    current: false,
  },
];

const refused = (message: string) => new ScyllaError(message, { code: 'FAILED_PRECONDITION' });

let teardown: Array<() => void> = [];
let repository: Record<string, ReturnType<typeof vi.fn>>;
let navigator: ReturnType<typeof installTestNavigator>;

const setUp = (
  section: string | undefined,
  overrides: Record<string, ReturnType<typeof vi.fn>> = {},
  organizationSlug: string | null = 'acme-corp',
) => {
  repository = {
    getMe: vi.fn().mockResolvedValue(me),
    listAccess: vi.fn().mockResolvedValue(access),
    update: vi.fn().mockResolvedValue(me),
    changePassword: vi.fn().mockResolvedValue(undefined),
    revokeSessions: vi.fn().mockResolvedValue(2),
    listSessions: vi.fn().mockResolvedValue(sessions),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ user: { userRepository: repository } })];
  render(AccountPage, { organizationSlug: organizationSlug ?? undefined, section });
};

const section = (name: string) => screen.getByRole('region', { name });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('userId', 'user-1');
  navigator = installTestNavigator({ pathname: '/acme-corp/account/profile' });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
  localStorage.clear();
});

describe('AccountPage', () => {
  it('shows who is signed in, from the account of the session', async () => {
    setUp('profile');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ada Lovelace' }),
    ).toBeInTheDocument();
    expect(repository.getMe).toHaveBeenCalled();
  });

  it('shows the email, the handle and the role of the first system grant in the header', async () => {
    setUp('profile');

    const header = (await screen.findByRole('heading', { level: 1 })).closest('header')!;
    expect(within(header).getByText('ada@example.com')).toBeInTheDocument();
    expect(within(header).getByText('@ada')).toHaveAttribute('data-slot', 'badge');
    expect(await within(header).findByText('System admin')).toHaveAttribute('data-slot', 'badge');
  });

  it('shows no role badge for a user with no system grant', async () => {
    setUp('organizations', { listAccess: vi.fn().mockResolvedValue(access.slice(1)) });

    await screen.findByText('Organization admin');
    const header = screen.getByRole('heading', { level: 1 }).closest('header')!;
    expect(within(header).queryByText('Organization admin')).not.toBeInTheDocument();
    expect(header.querySelectorAll('[data-slot="badge"]')).toHaveLength(1);
  });

  it('links each entry of the settings nav to its page, and marks the current one', async () => {
    setUp('security');

    const nav = await screen.findByRole('navigation', { name: 'Account settings' });
    const links = within(nav).getAllByRole('link');
    expect(links.map(link => [link.textContent?.trim(), link.getAttribute('href')])).toEqual([
      ['Profile', '/acme-corp/account/profile'],
      ['Appearance', '/acme-corp/account/appearance'],
      ['Security', '/acme-corp/account/security'],
      ['Organizations', '/acme-corp/account/organizations'],
      ['Danger zone', '/acme-corp/account/danger-zone'],
    ]);
    expect(within(nav).getByRole('link', { current: 'page' })).toHaveTextContent('Security');
  });

  it('links the nav to /account outside an organization', async () => {
    setUp('profile', {}, null);

    const nav = await screen.findByRole('navigation', { name: 'Account settings' });
    expect(within(nav).getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/account/profile',
    );
  });

  it('shows only the sections of the current page', async () => {
    setUp('security');

    await screen.findByRole('region', { name: 'Password' });
    expect(
      screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent?.trim()),
    ).toEqual(['Password', 'Sessions']);
  });

  it('sends an unknown section to the profile', async () => {
    setUp('billing');

    await waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('../profile', { replace: true }),
    );
  });

  it('shows an error when the account cannot be read', async () => {
    setUp('profile', { getMe: vi.fn().mockRejectedValue(refused('down')) });

    expect(await screen.findByText('Error loading your account')).toBeInTheDocument();
  });

  describe('profile', () => {
    it('shows the email read-only, with the reason', async () => {
      setUp('profile');

      const email = await screen.findByLabelText('Email');
      expect(email).toHaveAttribute('readonly');
      expect(email).toHaveAccessibleDescription('Only an administrator can change it.');
      expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(
        'A handle that other people see.',
      );
    });

    it('saves the changed fields only', async () => {
      setUp('profile');
      const user = userEvent.setup();

      const displayName = await screen.findByLabelText('Display name');
      await user.clear(displayName);
      await user.type(displayName, 'Ada King');
      await user.click(within(section('Profile')).getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(repository.update).toHaveBeenCalledWith({
          id: 'user-1',
          displayName: 'Ada King',
        }),
      );
    });

    it('calls nothing when nothing changed', async () => {
      setUp('profile');
      const user = userEvent.setup();

      await screen.findByLabelText('Display name');
      await user.click(within(section('Profile')).getByRole('button', { name: 'Save' }));

      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  it('shows the theme choice on the appearance page', async () => {
    setUp('appearance');

    const appearance = await screen.findByRole('region', { name: 'Appearance' });
    expect(within(appearance).getAllByRole('radio')).toHaveLength(3);
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
      setUp('security');

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
      setUp('security', {
        changePassword: vi.fn().mockRejectedValue(refused('Current password is incorrect')),
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
      setUp('security');

      await changeFrom('old-password', 'new-password', 'other-password');

      expect(screen.getByText('The two passwords are not the same.')).toBeInTheDocument();
      expect(repository.changePassword).not.toHaveBeenCalled();
    });

    it('gives each field its autocomplete value', async () => {
      setUp('security');

      expect(await screen.findByLabelText('Current password')).toHaveAttribute(
        'autocomplete',
        'current-password',
      );
      expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password');
    });
  });

  describe('sessions', () => {
    it('lists the sessions, marks the current one and gives it no sign-out button', async () => {
      setUp('security');

      const list = await screen.findByRole('region', { name: 'Sessions' });
      expect(await within(list).findByText('Chrome on macOS')).toBeInTheDocument();
      expect(within(list).getByText('This session')).toBeInTheDocument();
      expect(within(list).getByText('Firefox on Windows')).toBeInTheDocument();
      expect(within(list).getByText('198.51.100.4 · Active now')).toBeInTheDocument();
      expect(
        within(list).queryByRole('button', { name: 'Sign out Chrome on macOS' }),
      ).not.toBeInTheDocument();
      expect(
        within(list).getByRole('button', { name: 'Sign out Firefox on Windows' }),
      ).toBeInTheDocument();
      expect(repository.listSessions).toHaveBeenCalledWith('user-1');
    });

    it('signs out one other session, then reads the list again', async () => {
      setUp('security');
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Sign out Firefox on Windows' }));

      await waitFor(() =>
        expect(repository.revokeSession).toHaveBeenCalledWith('user-1', 'session-2'),
      );
      await waitFor(() => expect(repository.listSessions).toHaveBeenCalledTimes(2));
      expect(signOut).not.toHaveBeenCalled();
    });

    it('signs out the other sessions, tells how many, and reads the list again', async () => {
      setUp('security');
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Sign out everywhere else' }));

      await waitFor(() => expect(repository.revokeSessions).toHaveBeenCalledWith('user-1'));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 sessions signed out.'));
      await waitFor(() => expect(repository.listSessions).toHaveBeenCalledTimes(2));
    });

    it('says when no session is active', async () => {
      setUp('security', { listSessions: vi.fn().mockResolvedValue([]) });

      const list = await screen.findByRole('region', { name: 'Sessions' });
      expect(await within(list).findByText('No active session.')).toBeInTheDocument();
    });

    it('shows an error when the sessions cannot be read', async () => {
      setUp('security', { listSessions: vi.fn().mockRejectedValue(refused('down')) });

      const list = await screen.findByRole('region', { name: 'Sessions' });
      expect(await within(list).findByText('Error loading the sessions')).toBeInTheDocument();
    });
  });

  it('lists the roles by organization, the system grants apart', async () => {
    setUp('organizations');

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
      const zone = await screen.findByRole('region', { name: 'Delete my account' });
      await user.click(within(zone).getByRole('button', { name: 'Delete my account' }));
      const dialog = await screen.findByRole('dialog');
      await focusSettled();
      await user.type(within(dialog).getByLabelText('Password'), password);
      await user.click(within(dialog).getByRole('button', { name: 'Delete my account' }));
      return dialog;
    };

    it('asks for the password, deletes the account and signs out', async () => {
      setUp('danger-zone');

      await confirmWith('my-password');

      await waitFor(() => expect(repository.deleteAccount).toHaveBeenCalledWith('my-password'));
      await waitFor(() => expect(signOut).toHaveBeenCalled());
    });

    it('shows the refusal of the server in the dialog, and stays signed in', async () => {
      setUp('danger-zone', {
        deleteAccount: vi
          .fn()
          .mockRejectedValue(refused('Appoint another admin of Acme Corp first')),
      });

      const dialog = await confirmWith('my-password');

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Appoint another admin of Acme Corp first',
      );
      expect(signOut).not.toHaveBeenCalled();
    });
  });
});

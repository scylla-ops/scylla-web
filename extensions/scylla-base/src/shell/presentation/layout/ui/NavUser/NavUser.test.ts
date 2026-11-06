import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as Login from '@base/features/login';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import InSidebar from '../__test__/InSidebar.fixture.svelte';
import NavUser from './NavUser.svelte';

const signOut = vi.fn();
vi.mock('@base/features/login', async importOriginal => ({
  ...(await importOriginal<typeof Login>()),
  signOut: () => signOut(),
}));

const me = {
  id: 'user-1',
  username: 'ravenne',
  displayName: 'Ravenne Lee',
  email: 'ravenne@example.com',
  isActive: true,
  updatedAt: '2025-01-01T00:00:00.000Z',
};

let teardown: Array<() => void> = [];
let navigator: ReturnType<typeof installTestNavigator>;
let getMe: ReturnType<typeof vi.fn>;

const setUp = (answer: () => Promise<unknown>) => {
  getMe = vi.fn(answer);
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ user: { userRepository: { getMe } } })];
  return render(InSidebar, { component: NavUser });
};

beforeEach(() => {
  vi.clearAllMocks();
  navigator = installTestNavigator();
  contextStore.setState({ workspace: { id: 'org-1', name: 'Acme', slug: null } });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
});

describe('NavUser', () => {
  describe('on the rail', () => {
    const at = async (pathname: string) => {
      navigator.restore();
      navigator = installTestNavigator({ pathname });
      setUp(() => Promise.resolve(me));
      return screen.findByRole('button', { name: /Ravenne Lee/ });
    };

    it('has the state of a selected rail item on the account page', async () => {
      const button = await at('/acme/account/tokens');

      expect(button).toHaveClass('bg-sidebar-primary', 'text-sidebar-primary-foreground');
      expect(button).toHaveAttribute('aria-current', 'page');
    });

    it('has the same state on the help page, which its menu opens', async () => {
      const button = await at('/acme/help/tours');

      expect(button).toHaveAttribute('aria-current', 'page');
    });

    it.each(['/acme/dashboard', '/acme/accounting', '/other/account/profile'])(
      'has no such state on %s',
      async pathname => {
        const button = await at(pathname);

        expect(button).not.toHaveClass('bg-sidebar-primary');
        expect(button).not.toHaveAttribute('aria-current');
      },
    );

    it('still opens the menu on the account page', async () => {
      const button = await at('/acme/account/profile');

      await userEvent.setup().click(button);

      expect(await findFloating('menuitem', 'Sign out')).toBeInTheDocument();
      expect(navigator.navigate).not.toHaveBeenCalled();
    });
  });

  it('shows the shape of the user until the account arrives', () => {
    setUp(() => new Promise(() => {}));

    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows who is signed in, from the account of the session', async () => {
    setUp(() => Promise.resolve(me));

    expect(await screen.findByText('Ravenne Lee')).toBeInTheDocument();
    expect(screen.getByText('RL')).toBeInTheDocument();
    expect(getMe).toHaveBeenCalled();
  });

  it('opens the account page from the menu', async () => {
    setUp(() => Promise.resolve(me));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Ravenne Lee/ }));
    await user.click(await findFloating('menuitem', 'Account'));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/account', undefined);
  });

  it('opens the help page from the menu', async () => {
    setUp(() => Promise.resolve(me));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Ravenne Lee/ }));
    await user.click(await findFloating('menuitem', 'Help & tours'));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/help', undefined);
  });

  it('signs the user out from the menu', async () => {
    setUp(() => Promise.resolve(me));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Ravenne Lee/ }));
    await user.click(await findFloating('menuitem', 'Sign out'));

    expect(signOut).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as Login from '@base/features/login';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import InSidebar from '../__test__/InSidebar.fixture.svelte';
import NavUser from './NavUser.svelte';

const signOut = vi.fn();
vi.mock('@base/features/login', async importOriginal => ({
  ...(await importOriginal<typeof Login>()),
  signOut: () => signOut(),
}));

const me = {
  userId: 'user-1',
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
  contextStore.setState({ organization: { id: 'org-1', name: 'Acme' } });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
});

describe('NavUser', () => {
  it('shows a loading label until the account arrives', () => {
    setUp(() => new Promise(() => {}));

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows who is signed in, from the account of the session', async () => {
    setUp(() => Promise.resolve(ScyllaResult.success(me)));

    expect(await screen.findByText('Ravenne Lee')).toBeInTheDocument();
    expect(screen.getByText('ravenne@example.com')).toBeInTheDocument();
    expect(screen.getByText('RL')).toBeInTheDocument();
    expect(getMe).toHaveBeenCalled();
  });

  it('opens the account page from the menu', async () => {
    setUp(() => Promise.resolve(ScyllaResult.success(me)));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Ravenne Lee/ }));
    await user.click(await findFloating('menuitem', 'Account'));

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/account', undefined);
  });

  it('signs the user out from the menu', async () => {
    setUp(() => Promise.resolve(ScyllaResult.success(me)));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Ravenne Lee/ }));
    await user.click(await findFloating('menuitem', 'Sign out'));

    expect(signOut).toHaveBeenCalled();
  });
});

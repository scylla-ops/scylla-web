import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import UserSettingsPage from './UserSettings.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let teardown: Array<() => void> = [];
let getById: ReturnType<typeof vi.fn>;
let update: ReturnType<typeof vi.fn>;

const setUp = (userId?: string) => {
  getById = vi.fn((id: string) =>
    Promise.resolve(ScyllaResult.success({ userId: id, username: 'ravenne' })),
  );
  update = vi.fn((id: string, username?: string) =>
    Promise.resolve(ScyllaResult.success({ userId: id, username })),
  );
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ user: { userRepository: { getById, update } } })];
  return render(UserSettingsPage, { userId });
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('userId', 'user-1');
});

afterEach(() => {
  teardown.forEach(restore => restore());
  localStorage.clear();
});

describe('UserSettingsPage', () => {
  it.each([['me'], [undefined]])('reads the logged-in user for the id %s', async userId => {
    setUp(userId);

    expect(await screen.findByText('ravenne')).toBeInTheDocument();
    expect(getById).toHaveBeenCalledWith('user-1');
  });

  it('reads the user of the route', async () => {
    setUp('user-2');

    expect(await screen.findByText('ravenne')).toBeInTheDocument();
    expect(getById).toHaveBeenCalledWith('user-2');
  });

  it('saves the logged-in user for the id me', async () => {
    setUp('me');
    const user = userEvent.setup();

    const username = await screen.findByLabelText('Username');
    await user.clear(username);
    await user.type(username, 'ada');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(update).toHaveBeenCalledWith('user-1', 'ada'));
  });
});

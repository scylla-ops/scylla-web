import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
import UserAvatarCard from './UserAvatarCard.svelte';

const me: UserEntity = {
  id: 'user-1',
  username: 'ada',
  displayName: 'Ada Lovelace',
  isActive: true,
  updatedAt: '2025-01-01T00:00:00.000Z',
};

let teardown: Array<() => void> = [];

const setUp = (user: UserEntity = me) => {
  const repository = { updateAvatar: vi.fn().mockResolvedValue(user) };
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ user: { userRepository: repository } })];
  render(UserAvatarCard, { user });
  return repository;
};

afterEach(() => teardown.forEach(restore => restore()));

describe('UserAvatarCard', () => {
  it('uploads a photo, and refuses a file that the server would refuse', async () => {
    const repository = setUp();
    const user = userEvent.setup({ applyAccept: false });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;

    await user.upload(input, new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This type of file is not accepted');
    await user.upload(input, new File([new Uint8Array([1, 2])], 'a.png', { type: 'image/png' }));

    await waitFor(() =>
      expect(repository.updateAvatar).toHaveBeenCalledWith({ image: new Uint8Array([1, 2]) }),
    );
    expect(repository.updateAvatar).toHaveBeenCalledOnce();
  });

  it('removes the photo', async () => {
    const repository = setUp({ ...me, avatarUrl: '/images/img-1' });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Remove the image' }));

    await waitFor(() => expect(repository.updateAvatar).toHaveBeenCalledWith({ image: null }));
  });

  it('has no photo to remove when the user has none', () => {
    setUp();

    expect(screen.getByRole('button', { name: 'Remove the image' })).toBeDisabled();
  });

  it('sends the chosen color, and the main color as the default color', async () => {
    const repository = setUp({ ...me, avatarColor: 'chart-4' });
    const user = userEvent.setup();

    expect(screen.getByRole('button', { name: 'Color 4' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Color 2' }));
    await waitFor(() => expect(repository.updateAvatar).toHaveBeenCalledWith({ color: 'chart-2' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Main color' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Main color' }));

    await waitFor(() => expect(repository.updateAvatar).toHaveBeenLastCalledWith({ color: '' }));
  });

  it('sends nothing for the color that the user has', async () => {
    const repository = setUp();
    const user = userEvent.setup();

    expect(screen.getByRole('button', { name: 'Main color' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Main color' }));

    expect(repository.updateAvatar).not.toHaveBeenCalled();
  });
});

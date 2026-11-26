import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { contextStore } from '@platform/context';
import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
import { openProfilePhoto, photoFocus } from './photo-focus.state.svelte.ts';
import UserAvatarCard from './UserAvatarCard.svelte';

const me: UserEntity = {
  id: 'user-1',
  username: 'ada',
  displayName: 'Ada Lovelace',
  isActive: true,
  updatedAt: '2025-01-01T00:00:00.000Z',
};

let teardown: Array<() => void> = [];

/** GitHub gave a photo, the SSO gave none. */
const identities = [
  { provider: 'github', subject: '42', email: '', linkedAt: '', hasPicture: true },
  { provider: 'corp', subject: 'ada', email: '', linkedAt: '', hasPicture: false },
];

const setUp = (user: UserEntity = me) => {
  const repository = {
    updateAvatar: vi.fn((input: { color?: string }) =>
      Promise.resolve({ ...user, avatarColor: input.color ?? user.avatarColor }),
    ),
    listSignInMethods: vi.fn().mockResolvedValue({ hasPassword: true, identities }),
    importAvatar: vi.fn().mockResolvedValue({ ...user, avatarUrl: '/images/img-2' }),
  };
  const loginRepository = {
    listSignInMethods: vi.fn().mockResolvedValue({
      providers: [
        { slug: 'github', displayName: 'GitHub', kind: 'github' },
        { slug: 'corp', displayName: 'Corp SSO', kind: 'oidc' },
      ],
      signUpMode: 'closed',
    }),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ user: { userRepository: repository }, login: { loginRepository } }),
  ];
  render(UserAvatarCard, { user });
  return repository;
};

afterEach(() => {
  teardown.forEach(restore => restore());
  vi.useRealTimers();
  localStorage.clear();
  photoFocus.pending = false;
});

/** The picker of the free color opens in a floating layer, which jsdom does not lay out. */
const hexField = () => screen.findByLabelText<HTMLInputElement>('Hex color');

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

  it('offers the photo of each linked provider that gave one', async () => {
    setUp();

    expect(await screen.findByRole('button', { name: 'Use my GitHub photo' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Use my Corp SSO photo' })).toBeNull();
  });

  it('imports the photo of the provider at once when the user has no photo', async () => {
    const repository = setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Use my GitHub photo' }));

    await waitFor(() => expect(repository.importAvatar).toHaveBeenCalledWith('github', '42'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your GitHub photo is your profile photo',
    );
  });

  it('asks before the photo of the provider replaces a photo', async () => {
    const repository = setUp({ ...me, avatarUrl: '/images/img-1' });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Use my GitHub photo' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Replace your profile photo?');
    expect(dialog).toHaveTextContent('Your GitHub photo replaces the current photo.');
    expect(repository.importAvatar).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Replace' }));

    await waitFor(() => expect(repository.importAvatar).toHaveBeenCalledWith('github', '42'));
  });

  it('tells when the photo of the provider cannot be imported', async () => {
    const repository = setUp();
    repository.importAvatar.mockRejectedValue(new Error('PICTURE_UNAVAILABLE'));
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Use my GitHub photo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The GitHub photo could not be imported. Try again later.',
    );
  });

  it('offers the free color of the icons, with its hex field and its contrast lines', async () => {
    setUp({ ...me, avatarColor: '#3366cc' });
    const user = userEvent.setup();

    expect(screen.getByRole('button', { name: 'Free color' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Free color' }));

    expect(await hexField()).toHaveValue('3366CC');
    expect(screen.getByText(/Dark theme .*:1/)).toBeInTheDocument();
    expect(screen.getByText(/Light theme .*:1/)).toBeInTheDocument();
  });

  it('saves a free color once it stops moving, and keeps it in the recent colors', async () => {
    const repository = setUp();
    const user = userEvent.setup();
    localStorage.setItem('scylla.recent-colors', JSON.stringify(['#22D3EE']));

    await user.click(screen.getByRole('button', { name: 'Free color' }));
    const field = await hexField();
    await user.clear(field);
    await user.type(field, 'BA4C43');

    // The initials show the color at once, and the server gets only the last color.
    const preview = document.querySelectorAll<HTMLElement>('[data-kind="self"]')[1];
    expect(preview.style.getPropertyValue('--avatar-tile')).toBe('#BA4C43');
    await waitFor(() => expect(repository.updateAvatar).toHaveBeenCalledWith({ color: '#BA4C43' }));
    expect(repository.updateAvatar).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('scylla.recent-colors') ?? '[]')[0]).toBe('#BA4C43'),
    );
  });

  it('brings the card into view and puts the focus in it, on a click on the own avatar elsewhere', async () => {
    const navigator = installTestNavigator();
    contextStore.setState({ workspace: { id: 'org-1', name: 'Acme', slug: 'acme' } });
    teardown.push(navigator.restore);

    openProfilePhoto();
    setUp();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme/account/profile', undefined);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Upload an image' })).toHaveFocus(),
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(photoFocus.pending).toBe(false);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import OwnersCard from './OwnersCard.svelte';

let teardown: Array<() => void> = [];

const setUp = (owners: { userId: string; displayName: string }[], canManage = true) => {
  const repository = {
    listOwners: vi.fn().mockResolvedValue(owners.map(owner => ({ ...owner, since: '' }))),
    addOwner: vi.fn().mockResolvedValue(undefined),
    removeOwner: vi.fn().mockResolvedValue(undefined),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ workspace: { workspaceRepository: repository } }),
  ];
  render(OwnersCard, {
    workspaceId: 'ws-1',
    members: [
      { id: 'ada', username: 'ada', displayName: 'Ada' },
      { id: 'bob', username: 'bob', displayName: 'Bob' },
    ],
    canManage,
  });
  return repository;
};

afterEach(() => teardown.forEach(restore => restore()));

describe('OwnersCard', () => {
  it('lists the owners, and lets no one remove the last one', async () => {
    setUp([{ userId: 'ada', displayName: 'Ada' }]);

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Ada from the owners' })).toBeNull();
  });

  it('removes an owner when another one stays', async () => {
    const repository = setUp([
      { userId: 'ada', displayName: 'Ada' },
      { userId: 'bob', displayName: 'Bob' },
    ]);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Remove Bob from the owners' }));

    await waitFor(() => expect(repository.removeOwner).toHaveBeenCalledWith('ws-1', 'bob'));
  });

  it('shows no action to a person who is not an owner', async () => {
    setUp(
      [
        { userId: 'ada', displayName: 'Ada' },
        { userId: 'bob', displayName: 'Bob' },
      ],
      false,
    );

    await screen.findByText('Ada');
    expect(screen.queryByRole('button', { name: /from the owners/ })).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

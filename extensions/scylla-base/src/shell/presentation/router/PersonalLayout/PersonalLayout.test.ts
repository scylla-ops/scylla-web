import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import PersonalLayoutFixture from './PersonalLayout.fixture.svelte';

let teardown: Array<() => void> = [];
let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  localStorage.clear();
  navigator = installTestNavigator();
  const cache = withQueryClient();
  const getMe = vi
    .fn()
    .mockResolvedValue(
      ScyllaResult.success({ userId: 'user-1', username: 'ada', isActive: true, updatedAt: '' }),
    );
  teardown = [cache.restore, withRegistry({ user: { userRepository: { getMe } } })];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
});

describe('PersonalLayout', () => {
  it('shows the page with no organization, under a way back', () => {
    localStorage.setItem('token', 'a-token');
    render(PersonalLayoutFixture);

    expect(screen.getByText('account page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/');
  });

  it('has no top bar, and no link to the page it shows', () => {
    localStorage.setItem('token', 'a-token');
    render(PersonalLayoutFixture);

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Account' })).not.toBeInTheDocument();
  });

  it('sends a signed-out user to /login', () => {
    render(PersonalLayoutFixture);

    expect(navigator.navigate).toHaveBeenCalledWith('/login', { replace: true });
    expect(screen.queryByText('account page')).not.toBeInTheDocument();
  });
});

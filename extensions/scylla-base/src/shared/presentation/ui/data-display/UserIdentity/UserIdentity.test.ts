import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.svelte.ts';
import UserIdentity from './UserIdentity.svelte';

describe('UserIdentity', () => {
  it('shows the display name, the email and the initials', () => {
    const { container } = render(UserIdentity, {
      user: { username: 'ada', displayName: 'Ada Lovelace', email: 'ada@example.com' },
    });

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('AL');
  });

  it('shows the username and the handle when there is no display name and no email', () => {
    render(UserIdentity, { user: { username: 'ravenne' } });

    expect(screen.getByText('ravenne')).toBeInTheDocument();
    expect(screen.getByText('@ravenne')).toBeInTheDocument();
  });

  it('keeps the full name reachable as a title, since the line truncates', () => {
    render(UserIdentity, { user: { username: 'a-very-long-service-account-name' } });

    expect(screen.getByTitle('a-very-long-service-account-name')).toBeInTheDocument();
  });

  it('shows a missing user as "Deleted user", with no second line', () => {
    const { container } = render(UserIdentity, { user: undefined });

    expect(screen.getByText('Deleted user')).toBeInTheDocument();
    expect(container.querySelectorAll('[title]')).toHaveLength(1);
  });

  it('shows a user that the page cannot read as "Unknown user" on request', () => {
    render(UserIdentity, { user: undefined, missing: 'unknown' });

    expect(screen.getByText('Unknown user')).toBeInTheDocument();
    expect(screen.queryByText('Deleted user')).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import Identity from './Identity.svelte';

const avatarOf = (container: HTMLElement) => container.querySelector('[data-kind]');

describe('Identity', () => {
  it('shows the display name, the email and the initials', () => {
    const { container } = render(Identity, {
      profile: { username: 'ada', displayName: 'Ada Lovelace', email: 'ada@example.com' },
    });

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(avatarOf(container)).toHaveTextContent('AL');
    expect(avatarOf(container)).toHaveAttribute('data-kind', 'person');
  });

  it('shows the username and the handle when there is no display name and no email', () => {
    render(Identity, { profile: { username: 'ravenne' } });

    expect(screen.getByText('ravenne')).toBeInTheDocument();
    expect(screen.getByText('@ravenne')).toBeInTheDocument();
  });

  it('keeps the full name reachable as a title, since the line truncates', () => {
    render(Identity, { profile: { username: 'a-very-long-service-account-name' } });

    expect(screen.getByTitle('a-very-long-service-account-name')).toBeInTheDocument();
  });

  it('shows a missing user as "Deleted user", with no second line', () => {
    const { container } = render(Identity, { profile: undefined });

    expect(screen.getByText('Deleted user')).toBeInTheDocument();
    expect(container.querySelectorAll('[title]')).toHaveLength(1);
    expect(avatarOf(container)).toHaveAttribute('data-kind', 'missing');
  });

  it('shows a user that the page cannot read as "Unknown user" on request', () => {
    render(Identity, { profile: undefined, missing: 'unknown' });

    expect(screen.getByText('Unknown user')).toBeInTheDocument();
    expect(screen.queryByText('Deleted user')).not.toBeInTheDocument();
  });

  it('names an agent as an agent, with the avatar of a machine and no handle', () => {
    const { container } = render(Identity, {
      profile: { username: '', displayName: 'build-agent-01' },
      kind: 'agent',
    });

    expect(screen.getByText('build-agent-01')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(avatarOf(container)).toHaveAttribute('data-kind', 'agent');
    expect(avatarOf(container)).not.toHaveTextContent('B');
  });

  it('names another app as an app in the one-line format', () => {
    const { container } = render(Identity, {
      profile: { username: '', displayName: 'github-ci' },
      kind: 'app',
      format: 'cell',
    });

    expect(screen.getByText('github-ci')).toBeInTheDocument();
    expect(screen.getByText('App')).toBeInTheDocument();
    expect(avatarOf(container)).toHaveAttribute('data-kind', 'app');
  });

  it('marks the person who reads the page with "You"', () => {
    const { container } = render(Identity, {
      profile: { username: 'seb', displayName: 'Sébastien Martin' },
      self: true,
    });

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(avatarOf(container)).toHaveAttribute('data-kind', 'self');
  });
});

describe('Identity in a sentence and in a chip', () => {
  it('names the reader "You" in a sentence, with the small avatar of a person', () => {
    const { container } = render(Identity, {
      profile: { username: 'seb', displayName: 'Sébastien Martin' },
      self: true,
      format: 'mention',
    });

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.queryByText('Sébastien Martin')).not.toBeInTheDocument();
    expect(avatarOf(container)).toHaveAttribute('data-kind', 'self');
    expect(avatarOf(container)).toHaveTextContent(/^S$/);
  });

  it('shows the machine in a sentence with its own avatar', () => {
    const { container } = render(Identity, {
      profile: { username: '', displayName: 'build-agent-01' },
      kind: 'agent',
      format: 'mention',
    });

    expect(screen.getByText('build-agent-01')).toBeInTheDocument();
    expect(avatarOf(container)).toHaveAttribute('data-kind', 'agent');
  });

  it('removes a chip with its button, named after the actor', async () => {
    const onRemove = vi.fn();
    const { container } = render(Identity, {
      profile: { username: '', displayName: 'build-agent-01' },
      kind: 'agent',
      format: 'chip',
      onRemove,
    });

    expect(avatarOf(container)).toHaveAttribute('data-kind', 'agent');
    await userEvent.click(screen.getByRole('button', { name: 'Remove build-agent-01' }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('has no remove button on a chip that cannot go', () => {
    render(Identity, { profile: { username: 'ada' }, format: 'chip' });

    expect(screen.getByText('ada')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Identity as the header of a page', () => {
  it('gives the page its title, the handle and the email of a person', () => {
    const { container } = render(Identity, {
      profile: { username: 'marie', displayName: 'Marie Dupont', email: 'marie@acme.io' },
      format: 'header',
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Marie Dupont' })).toBeInTheDocument();
    expect(screen.getByText('@marie')).toBeInTheDocument();
    expect(screen.getByText('marie@acme.io')).toBeInTheDocument();
    expect(avatarOf(container)).toHaveClass('size-12');
  });

  it('names an agent as an agent in its badge', () => {
    const { container } = render(Identity, {
      profile: { username: '', displayName: 'build-agent-01' },
      kind: 'agent',
      format: 'header',
    });

    expect(screen.getByRole('heading', { level: 1, name: 'build-agent-01' })).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(avatarOf(container)).toHaveAttribute('data-kind', 'agent');
  });

  it('marks the reader with "You" in place of the handle', () => {
    render(Identity, {
      profile: { username: 'seb', displayName: 'Sébastien Martin' },
      self: true,
      format: 'header',
    });

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.queryByText('@seb')).not.toBeInTheDocument();
  });
});

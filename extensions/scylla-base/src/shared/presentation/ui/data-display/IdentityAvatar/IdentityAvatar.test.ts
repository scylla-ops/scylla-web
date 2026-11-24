import { describe, it, expect } from 'vitest';
import { render } from '@test/render.ts';
import IdentityAvatar from './IdentityAvatar.svelte';

const machine = { username: '', displayName: 'build-agent-01' };

describe('IdentityAvatar', () => {
  it('tells an agent, another app, a person and a missing actor apart', () => {
    const kinds = [
      render(IdentityAvatar, { profile: machine, kind: 'agent' }),
      render(IdentityAvatar, { profile: machine, kind: 'app' }),
      render(IdentityAvatar, { profile: { username: 'ada' } }),
      render(IdentityAvatar, { profile: undefined, kind: 'agent' }),
    ].map(({ container }) => container.querySelector('[data-kind]')?.getAttribute('data-kind'));

    expect(kinds).toEqual(['agent', 'app', 'person', 'missing']);
  });

  it('shows the online dot of an agent only', () => {
    const agent = render(IdentityAvatar, { profile: machine, kind: 'agent', online: true });
    const person = render(IdentityAvatar, { profile: { username: 'ada' }, online: true });

    expect(agent.container.querySelector('[data-slot="online"]')).toBeInTheDocument();
    expect(person.container.querySelector('[data-slot="online"]')).not.toBeInTheDocument();
  });

  it('keeps the solid look of the reader for a person only', () => {
    const { container } = render(IdentityAvatar, { profile: machine, kind: 'app', self: true });

    expect(container.querySelector('[data-kind]')).toHaveAttribute('data-kind', 'app');
  });
});

describe('IdentityAvatar at 16 px', () => {
  it('keeps one letter of a person, and the icon of a machine', () => {
    const person = render(IdentityAvatar, {
      profile: { username: 'ada', displayName: 'Ada Lovelace' },
      size: 16,
    });
    const agent = render(IdentityAvatar, { profile: machine, kind: 'agent', size: 16 });

    expect(person.container.querySelector('[data-kind]')).toHaveTextContent(/^A$/);
    expect(person.container.querySelector('[data-kind]')).toHaveClass('size-4');
    expect(agent.container.querySelector('svg')).toBeInTheDocument();
  });
});

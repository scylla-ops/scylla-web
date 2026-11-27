import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/svelte';
import { endTransitions, render } from '@test/render.ts';
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

describe('IdentityAvatar with a chosen avatar', () => {
  it('shows the photo of a person, and the initials when the photo does not load', async () => {
    const { container } = render(IdentityAvatar, {
      profile: { username: 'ada', displayName: 'Ada Lovelace', avatarUrl: '/images/img-1' },
    });
    const image = container.querySelector('img')!;

    expect(image).toHaveAttribute('src', '/images/img-1');
    await fireEvent.error(image);
    endTransitions();
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('[data-kind]')).toHaveTextContent('AL');
  });

  it('cross-fades a new photo or new initials with the old ones', async () => {
    const profile = { username: 'ada', displayName: 'Ada Lovelace', avatarUrl: '/images/img-1' };
    const { container, rerender } = render(IdentityAvatar, { profile });
    vi.mocked(Element.prototype.animate).mockClear();

    await rerender({ profile: { ...profile, avatarUrl: undefined, avatarColor: '#3366CC' } });

    // The photo fades out while the initials fade in, in the same place.
    expect(container.querySelector('img')).toBeInTheDocument();
    expect(container.querySelector('[data-kind]')).toHaveTextContent('AL');
    expect(Element.prototype.animate).toHaveBeenCalledTimes(2);
    endTransitions();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('shows the initials in the chosen color, on its tint, or solid for the reader', () => {
    const profile = { username: 'bruno', displayName: 'Bruno Martin', avatarColor: 'chart-4' };
    const other = render(IdentityAvatar, { profile }).container.querySelector('[data-kind]');
    const self = render(IdentityAvatar, { profile, self: true }).container.querySelector(
      '[data-kind]',
    ) as HTMLElement;

    expect(other).toHaveClass('bg-(--avatar-tile)', 'text-(--avatar-ink)');
    expect((other as HTMLElement).style.getPropertyValue('--avatar-ink')).toBe('var(--chart-4)');
    expect(self.style.getPropertyValue('--avatar-tile')).toBe('var(--chart-4)');
    // On the amber of the picker, near-black initials contrast more than the light ones.
    expect(self.style.getPropertyValue('--avatar-ink')).toBe('#171715');
  });

  it('shows the glyph that an admin chose for an agent, and the bot with none', () => {
    const chosen = render(IdentityAvatar, {
      profile: { ...machine, avatarGlyph: 'server', avatarColor: 'chart-3' },
      kind: 'agent',
    });
    const plain = render(IdentityAvatar, { profile: machine, kind: 'agent' });

    expect(chosen.container.querySelector('svg')).toHaveClass('lucide-server');
    expect(plain.container.querySelector('svg')).toHaveClass('lucide-bot');
  });

  it('keeps the class of the caller over the chosen color', () => {
    const { container } = render(IdentityAvatar, {
      profile: { username: 'ada', avatarColor: 'chart-2' },
      class: 'bg-transparent',
    });

    expect(container.querySelector('[data-kind]')).toHaveClass('bg-transparent');
    expect(container.querySelector('[data-kind]')).not.toHaveClass('bg-(--avatar-tile)');
  });
});

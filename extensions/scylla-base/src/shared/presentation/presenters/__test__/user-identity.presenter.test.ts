// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  avatarColors,
  identityKindOf,
  identitySecondaryLine,
  userInitials,
  userName,
  userSecondaryLine,
} from '../user-identity.presenter.ts';
import { SWATCH_COLORS } from '@scylla/ui';
import { colorIn, contrastRatio, parseHex } from '@scylla/ui/utils';

const ada = { username: 'ada', displayName: 'Ada Lovelace', email: 'ada@example.com' };

describe('userName', () => {
  it('prefers the display name', () => {
    expect(userName(ada)).toBe('Ada Lovelace');
  });

  it('falls back to the username when there is no display name', () => {
    expect(userName({ username: 'ravenne' })).toBe('ravenne');
  });

  it('falls back to the username when the display name is empty', () => {
    expect(userName({ username: 'ravenne', displayName: '' })).toBe('ravenne');
  });

  it('names a missing user "Deleted user", never by an id', () => {
    expect(userName(undefined)).toBe('Deleted user');
  });

  it('names a user that the page cannot read "Unknown user" on request', () => {
    expect(userName(undefined, 'unknown')).toBe('Unknown user');
  });
});

describe('userSecondaryLine', () => {
  it('shows the email when it is known', () => {
    expect(userSecondaryLine(ada)).toBe('ada@example.com');
  });

  it('shows the handle when the email is not known', () => {
    expect(userSecondaryLine({ username: 'ravenne' })).toBe('@ravenne');
  });
});

describe('userInitials', () => {
  it('takes the first letter of the first two words of the display name', () => {
    expect(userInitials(ada)).toBe('AL');
  });

  it('splits a username on its separators', () => {
    expect(userInitials({ username: 'john.doe' })).toBe('JD');
  });

  it('gives one letter for a one-word name', () => {
    expect(userInitials({ username: 'ravenne' })).toBe('R');
  });
});

describe('identityKindOf', () => {
  it('tells a person, an agent and another app apart', () => {
    expect(identityKindOf({ actorKind: 'user', runner: false })).toBe('person');
    expect(identityKindOf({ actorKind: 'app', runner: true })).toBe('agent');
    expect(identityKindOf({ actorKind: 'app', runner: false })).toBe('app');
  });
});

describe('identitySecondaryLine', () => {
  it('names the kind of a machine in place of a handle', () => {
    const machine = { username: '', displayName: 'github-ci' };

    expect(identitySecondaryLine(machine, 'agent')).toBe('Agent');
    expect(identitySecondaryLine(machine, 'app')).toBe('App');
    expect(identitySecondaryLine(ada, 'person')).toBe('ada@example.com');
  });
});

describe('avatarColors', () => {
  it('shows a color of the theme on its tint, or solid with initials that contrast with it', () => {
    expect(avatarColors('chart-4', false, 'dark')).toEqual({
      tile: 'color-mix(in srgb, var(--chart-4) 10%, transparent)',
      ink: 'var(--chart-4)',
    });
    expect(avatarColors('chart-4', true, 'dark')).toEqual({ tile: 'var(--chart-4)', ink: '#171715' });
  });

  it('keeps the initials readable on each solid color of the picker, in each theme', () => {
    // The light foreground of the main color was 1.9:1 on the amber of the light theme.
    expect(avatarColors('chart-4', true, 'light').ink).toBe('#171715');
    expect(avatarColors('chart-3', true, 'light').ink).toBe('#FFFFFF');
    expect(avatarColors('chart-3', true, 'dark').ink).toBe('#171715');
    for (const theme of ['light', 'dark'] as const) {
      for (const token of SWATCH_COLORS) {
        const { ink } = avatarColors(token, true, theme);
        expect(contrastRatio(colorIn(token, theme)!, parseHex(ink)!), `${token} ${theme}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('keeps the foreground of the main color on a color of the theme that it does not know', () => {
    expect(avatarColors('accent', true, 'dark')).toEqual({
      tile: 'var(--accent)',
      ink: 'var(--primary-foreground)',
    });
  });

  it('writes the initials on a solid free color in white or near-black, the one that contrasts more', () => {
    expect(avatarColors('#1E3A8A', true, 'light').ink).toBe('#FFFFFF');
    expect(avatarColors('#FDE68A', true, 'light').ink).toBe('#171715');
  });
});

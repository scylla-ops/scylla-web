import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChoiceCommand } from '@scylla/core-sdk';
import { getThemePreference, setThemePreference } from '@scylla/ui/stores';
import { userCommands } from '../user.commands.ts';
import { photoFocus } from '../ui/components/UserAvatarCard/photo-focus.state.svelte.ts';

const navigate = vi.hoisted(() => ({ goToWorkspaceRoute: vi.fn() }));
vi.mock('@platform/context', () => ({ scyllaNavigate: navigate }));

afterEach(() => setThemePreference('dark'));

const command = (id: string) => {
  const found = userCommands.find(item => item.id === id);
  if (!found) throw new Error(id);
  return found;
};

const themes = userCommands.filter((item): item is ChoiceCommand => item.kind === 'choice');

describe('the theme commands', () => {
  it('changes the theme of this device', async () => {
    setThemePreference('dark');

    await (command('user.theme-light') as ChoiceCommand).select();

    expect(getThemePreference()).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('says which one is the current choice', () => {
    setThemePreference('system');

    expect(themes.filter(item => item.current()).map(item => item.id)).toEqual([
      'user.theme-system',
    ]);
  });
});

describe('the command of the glyph avatar', () => {
  it('opens the card of the photo with the editor of the glyph avatar open', async () => {
    const make = command('user.glyph-avatar');
    if (make.kind !== 'action') throw new Error(make.kind);

    await make.run();

    expect(photoFocus).toEqual({ pending: true, glyph: true });
    expect(navigate.goToWorkspaceRoute).toHaveBeenCalledWith('/account/profile');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { getThemePreference, setThemePreference } from '@scylla/ui/stores';
import { userCommands } from '../user.commands.ts';

afterEach(() => setThemePreference('dark'));

const command = (id: string) => {
  const found = userCommands.find(item => item.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe('the theme commands', () => {
  it('changes the theme of this device', async () => {
    setThemePreference('dark');

    await command('user.theme-light').select();

    expect(getThemePreference()).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('says which one is the current choice', () => {
    setThemePreference('system');

    expect(userCommands.filter(item => item.current()).map(item => item.id)).toEqual([
      'user.theme-system',
    ]);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentLocale } from '@scylla/ui/i18n';
import { getThemePreference, setThemePreference } from '@scylla/ui/stores';
import { userState } from '@platform/user-state';
import { chooseLocale } from '../user-preferences.ts';

const server = vi.hoisted(() => ({
  entries: [] as { key: string; valueJson: string; version: bigint }[],
  getUserState: vi.fn(),
  putUserStateEntry: vi.fn(),
}));

vi.mock('@platform/user-state', async original => {
  const real = await original<typeof import('@platform/user-state')>();
  return { ...real, userState: real.createUserState(server as never) };
});

const flush = () => new Promise(resolve => setTimeout(resolve));

const writesOf = (key: string) =>
  server.putUserStateEntry.mock.calls.filter(([call]) => (call as { key: string }).key === key);

let firstLoad = true;
let keysWrittenByTheLoad: string[] = [];

beforeEach(async () => {
  server.getUserState.mockReturnValue({ response: Promise.resolve({ entries: server.entries }) });
  server.putUserStateEntry.mockImplementation(({ key, valueJson }: { key: string; valueJson: string }) => ({
    response: Promise.resolve({ entry: { key, valueJson, version: 2n } }),
  }));
  if (firstLoad) {
    firstLoad = false;
    localStorage.clear();
    server.entries = [{ key: 'theme', valueJson: '"light"', version: 1n }];
    server.getUserState.mockReturnValue({ response: Promise.resolve({ entries: server.entries }) });
    userState.load('ada');
    await userState.whenLoaded();
    await flush();
    keysWrittenByTheLoad = server.putUserStateEntry.mock.calls.map(
      ([call]) => (call as { key: string }).key,
    );
  }
  server.putUserStateEntry.mockClear();
});

describe('the theme', () => {
  it('takes the value of the server, and does not write it back', () => {
    expect(getThemePreference()).toBe('light');
    expect(localStorage.getItem('scylla-theme')).toBe('light');
    expect(keysWrittenByTheLoad).not.toContain('theme');
  });

  it('writes a choice of the person', async () => {
    setThemePreference('system');
    await flush();

    expect(writesOf('theme')).toEqual([[{ key: 'theme', valueJson: '"system"' }]]);
  });

  it('writes nothing when the choice stays the same', async () => {
    setThemePreference('dark');
    await flush();
    server.putUserStateEntry.mockClear();

    setThemePreference('dark');
    await flush();

    expect(writesOf('theme')).toEqual([]);
  });
});

describe('the language', () => {
  it('writes a choice of the person', async () => {
    await chooseLocale('fr');
    await flush();

    expect(getCurrentLocale()).toBe('fr');
    expect(writesOf('locale')).toEqual([[{ key: 'locale', valueJson: '"fr"' }]]);
    await chooseLocale('en');
  });

  it('does not upload the language of the browser at a first run', () => {
    expect(keysWrittenByTheLoad).not.toContain('locale');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushSync } from 'svelte';
import { userState } from '@platform/user-state';
import { WHATS_NEW } from '@base/shell/whats-new.ts';
import {
  dismissRelease,
  highlightIdForNav,
  isUnseen,
  markNavSeen,
  markSeen,
  unseenRelease,
} from '../whats-new.state.svelte.ts';
import type * as UserStateModule from '@platform/user-state';

const server = vi.hoisted(() => ({
  getUserState: vi.fn(),
  putUserStateEntry: vi.fn(),
}));

vi.mock('@platform/user-state', async original => {
  const real = await original<typeof UserStateModule>();
  return { ...real, userState: real.createUserState(server) };
});

const flush = () => new Promise(resolve => setTimeout(resolve));

beforeEach(() => {
  localStorage.clear();
  server.putUserStateEntry.mockReset();
  server.putUserStateEntry.mockReturnValue({
    response: Promise.resolve({ entry: { version: 2n } }),
  });
});

describe('isUnseen', () => {
  it('is true before anything is marked seen', () => {
    expect(isUnseen('dashboard')).toBe(true);
  });

  it('is false once markSeen is called for that id', () => {
    markSeen('dashboard');
    expect(isUnseen('dashboard')).toBe(false);
  });

  it('marking one id seen does not affect another', () => {
    markSeen('dashboard');
    expect(isUnseen('roles')).toBe(true);
  });

  it('reads the seen flag of the current release version', () => {
    localStorage.setItem(`whats-new-seen:${WHATS_NEW.version}:dashboard`, '1');
    expect(isUnseen('dashboard')).toBe(false);
  });

  it('updates a reactive reader when an id is marked seen', () => {
    const cleanup = $effect.root(() => {
      const unseen = $derived(isUnseen('dashboard'));
      flushSync();
      expect(unseen).toBe(true);

      markSeen('dashboard');
      flushSync();

      expect(unseen).toBe(false);
    });
    cleanup();
  });
});

describe('highlightIdForNav', () => {
  it('finds the highlight id for a nav url this release announces', () => {
    expect(highlightIdForNav('roles')).toBe('role-and-trigger-pages');
  });

  it('returns undefined for a url with no highlight in this release', () => {
    expect(highlightIdForNav('some-unrelated-page')).toBeUndefined();
  });
});

describe('markNavSeen', () => {
  it('marks seen the highlight that announces the opened link', () => {
    markNavSeen('roles');
    expect(isUnseen('role-and-trigger-pages')).toBe(false);
  });

  it('ignores a link that no highlight announces', () => {
    markNavSeen('secrets');
    expect(isUnseen('role-and-trigger-pages')).toBe(true);
  });
});

describe('the release announcement', () => {
  it('is the current release while the user did not dismiss it', () => {
    expect(unseenRelease()).toBe(WHATS_NEW);
  });

  it('is null after the user dismisses it', () => {
    dismissRelease();
    expect(unseenRelease()).toBeNull();
  });
});

describe('the flags on the server', () => {
  const known = WHATS_NEW.highlights[0]?.id ?? '';
  const other = WHATS_NEW.highlights[1]?.id ?? '';

  it('merges the flags of the two sides, and tells the readers', async () => {
    localStorage.setItem(`whats-new-seen:${WHATS_NEW.version}:${other}`, '1');
    server.getUserState.mockReturnValue({
      response: Promise.resolve({
        entries: [
          {
            key: 'whats-new-seen',
            valueJson: JSON.stringify({ version: WHATS_NEW.version, seen: ['release', known] }),
            version: 1n,
          },
        ],
      }),
    });

    userState.load('ada');
    await userState.whenLoaded();
    await flush();

    expect(isUnseen('release')).toBe(false);
    expect(isUnseen(known)).toBe(false);
    expect(server.putUserStateEntry).toHaveBeenCalledWith({
      key: 'whats-new-seen',
      valueJson: JSON.stringify({ version: WHATS_NEW.version, seen: ['release', known, other] }),
      expectedVersion: 1n,
    });
  });

  it('writes one time for a flag, because a link marks it at each open', async () => {
    markSeen('role-and-trigger-pages');
    markSeen('role-and-trigger-pages');
    await flush();

    expect(server.putUserStateEntry).toHaveBeenCalledOnce();
  });
});

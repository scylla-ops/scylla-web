import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { createNodeAppearancePreference, DEFAULT_NODE_APPEARANCE } from '../node-appearance-preference.state.svelte.ts';

const memoryStorage = (initial: Record<string, string> = {}): Storage => {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: key => data.get(key) ?? null,
    key: index => [...data.keys()][index] ?? null,
    removeItem: key => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
};

const blockedStorage = (): Storage => {
  const fail = () => {
    throw new Error('blocked');
  };
  return { ...memoryStorage(), getItem: fail, setItem: fail };
};

const KEY = 'scylla.blueprint.node-appearance';

const inRoot = (run: () => void) => {
  const cleanup = $effect.root(() => {
    run();
    flushSync();
  });
  cleanup();
};

describe('createNodeAppearancePreference', () => {
  it('starts on the default style', () => {
    inRoot(() => {
      expect(createNodeAppearancePreference(() => memoryStorage()).current).toBe(DEFAULT_NODE_APPEARANCE);
    });
  });

  it('remembers the chosen style for the next visit', () => {
    inRoot(() => {
      const storage = memoryStorage();
      createNodeAppearancePreference(() => storage).set('minimal');

      expect(storage.getItem(KEY)).toBe('minimal');
      expect(createNodeAppearancePreference(() => storage).current).toBe('minimal');
    });
  });

  it('ignores a stored value that is no style', () => {
    inRoot(() => {
      const storage = memoryStorage({ [KEY]: 'neon' });
      expect(createNodeAppearancePreference(() => storage).current).toBe(DEFAULT_NODE_APPEARANCE);
    });
  });

  it('still switches when the browser blocks the storage', () => {
    inRoot(() => {
      const appearance = createNodeAppearancePreference(blockedStorage);
      expect(appearance.current).toBe(DEFAULT_NODE_APPEARANCE);

      appearance.set('minimal');
      expect(appearance.current).toBe('minimal');
    });
  });
});

describe('the node style on the server', () => {
  it('reads the local copy again when the answer of the server comes after the mount', async () => {
    const storage = memoryStorage();
    let preference: ReturnType<typeof createNodeAppearancePreference> | undefined;
    const cleanup = $effect.root(() => {
      preference = createNodeAppearancePreference(() => storage);
      storage.setItem(KEY, 'minimal');
    });
    expect(preference?.current).toBe(DEFAULT_NODE_APPEARANCE);

    await Promise.resolve();
    await Promise.resolve();

    expect(preference?.current).toBe('minimal');
    cleanup();
  });

  it('keeps a choice of the person over a late answer of the server', async () => {
    const storage = memoryStorage({ [KEY]: 'minimal' });
    let preference: ReturnType<typeof createNodeAppearancePreference> | undefined;
    const cleanup = $effect.root(() => {
      preference = createNodeAppearancePreference(() => storage);
      preference.set('detailed');
      storage.setItem(KEY, 'minimal');
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(preference?.current).toBe('detailed');
    cleanup();
  });
});

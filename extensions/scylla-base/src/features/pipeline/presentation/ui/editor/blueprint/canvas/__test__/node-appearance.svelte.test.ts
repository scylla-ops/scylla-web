import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { createNodeAppearance, DEFAULT_NODE_APPEARANCE } from '../node-appearance.svelte.ts';

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

describe('createNodeAppearance', () => {
  it('starts on the default style', () => {
    inRoot(() => {
      expect(createNodeAppearance(() => memoryStorage()).current).toBe(DEFAULT_NODE_APPEARANCE);
    });
  });

  it('remembers the chosen style for the next visit', () => {
    inRoot(() => {
      const storage = memoryStorage();
      createNodeAppearance(() => storage).set('minimal');

      expect(storage.getItem(KEY)).toBe('minimal');
      expect(createNodeAppearance(() => storage).current).toBe('minimal');
    });
  });

  it('ignores a stored value that is no style', () => {
    inRoot(() => {
      const storage = memoryStorage({ [KEY]: 'neon' });
      expect(createNodeAppearance(() => storage).current).toBe(DEFAULT_NODE_APPEARANCE);
    });
  });

  it('still switches when the browser blocks the storage', () => {
    inRoot(() => {
      const appearance = createNodeAppearance(blockedStorage);
      expect(appearance.current).toBe(DEFAULT_NODE_APPEARANCE);

      appearance.set('minimal');
      expect(appearance.current).toBe('minimal');
    });
  });
});

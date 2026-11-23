import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import type { FragmentLink } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import { createFragmentLinks, type FragmentLinks } from '../fragment-links.state.svelte.ts';

const link = (blockId: string, version = 1): FragmentLink => ({
  blockId,
  fragmentId: `fragment-${blockId}`,
  version,
  values: {},
  nodeIds: [`${blockId}-build`],
});

/** Runs `steps` on links that start from `saved`; `refetch` gives them a new saved version. */
const withLinks = (
  saved: FragmentLink[],
  steps: (links: FragmentLinks, refetch: (next: FragmentLink[]) => void) => void,
) => {
  let initial = $state(saved);
  const cleanup = $effect.root(() => {
    const links = createFragmentLinks({ initial: () => initial });
    flushSync();
    steps(links, next => {
      initial = next;
      flushSync();
    });
  });
  cleanup();
};

describe('createFragmentLinks', () => {
  it('starts from the saved links, clean', () => {
    withLinks([link('lint')], links => {
      expect(links.current).toEqual([link('lint')]);
      expect(links.isDirty).toBe(false);
    });
  });

  it('is dirty when a block links a new fragment', () => {
    withLinks([], links => {
      links.set([link('greet')]);

      expect(links.isDirty).toBe(true);
    });
  });

  it('is clean at once when the save of the links succeeded', () => {
    withLinks([], links => {
      links.set([link('greet')]);
      links.markSaved(links.current);

      expect(links.isDirty).toBe(false);
    });
  });

  it('keeps a link changed while the save was sent unsaved', () => {
    withLinks([], links => {
      links.set([link('greet')]);
      const sent = links.current;
      links.set([link('greet', 2)]);
      links.markSaved(sent);

      expect(links.isDirty).toBe(true);
    });
  });

  it('follows the links that the server sends back after a save', () => {
    withLinks([], (links, refetch) => {
      links.set([link('greet')]);
      links.markSaved(links.current);
      refetch([link('greet', 1), link('lint')]);

      expect(links.current).toEqual([link('greet', 1), link('lint')]);
      expect(links.isDirty).toBe(false);
    });
  });

  it('keeps unsaved links when the server sends a new version', () => {
    withLinks([], (links, refetch) => {
      links.set([link('greet')]);
      refetch([link('lint')]);

      expect(links.current).toEqual([link('greet')]);
      expect(links.isDirty).toBe(true);
    });
  });
});
